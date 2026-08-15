"use client";
import { useEffect } from "react";
import {
  BackSide,
  Color,
  FrontSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  RepeatWrapping,
  Scene,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "@/lib/threeJs/three.module.js";

const THREE = {
  BackSide,
  Color,
  FrontSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  RepeatWrapping,
  Scene,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
};

export default function Page() {
  useEffect(() => {
    const { innerHeight: height, innerWidth: width } = window;
    const wrapper = document.querySelector("#webgl");
    let app = null;
    let active = true;
    if (wrapper) {
      app = new ThreeApp(wrapper, width, height);
      app.load().then(() => {
        if (!active) return;
        app.init();
        app.render();
      });
    }

    return () => {
      active = false;
      app?.dispose();
      if (wrapper) {
        while (wrapper.firstChild) {
          wrapper.removeChild(wrapper.firstChild);
        }
      }
    };
  }, []);

  return <div id="webgl" />;
}

class ThreeApp {
  /**
   * カメラ定義のための定数
   * NOTE: アスペクト比は引数の値を使用する
   * @param {number} fovy - 視野角
   * @param {number} near - カメラの前方クリップ面
   * @param {number} far - カメラの後方クリップ面
   * @param {THREE.Vector3} position - カメラの座標
   * @param {THREE.Vector3} lookAt - カメラの注視点
   */
  static CAMERA_PARAM = {
    fovy: 60,
    near: 0.1,
    far: 100.0,
    position: new THREE.Vector3(0.0, 0.0, 32.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   * NOTE: width, heightは引数の値を使用する
   * @param {number} clearColor - 画面をクリアする色
   * @param {number} rendererRatio - レンダラーの比率
   */
  static RENDERER_PARAM = {
    clearColor: 0xffffff,
    rendererRatio: 120,
  };

  wrapper; // canvas の親要素
  renderer; // レンダラ
  scene; // シーン
  camera; // カメラ
  planeMeshArray; // 板メッシュの配列
  frontTextures; // 前面テクスチャリスト
  backTextures; // 背面テクスチャリスト
  objectGroups; // グループリスト
  rayCaster; // レイキャスター
  isAnimating; // アニメーション中かどうか

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   * @param {number} width - 画面の幅
   * @param {number} height - 画面の高さ
   */
  constructor(wrapper, width, height) {
    this.wrapper = wrapper;
    this.width = width;
    this.height = height;
    this.render = this.render.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onResize = this.onResize.bind(this);
    this.isDisposed = false;

    // Raycaster のインスタンスを生成
    this.rayCaster = new THREE.Raycaster();

    // マウスのクリックイベントの定義
    window.addEventListener("click", this.onClick, false);
    // キーの押下や離す操作を検出できるようにする
    window.addEventListener("keydown", this.onKeyDown, false);

    // ウィンドウのリサイズを検出できるようにする
    window.addEventListener("resize", this.onResize, false);
  }

  onClick(mouseEvent) {
    if (this.isAnimating || !this.camera || !this.objectGroups) return;
    const x = (mouseEvent.clientX / window.innerWidth) * 2.0 - 1.0;
    const y = (mouseEvent.clientY / window.innerHeight) * 2.0 - 1.0;
    const normalizedMouse = new THREE.Vector2(x, -y);
    this.rayCaster.setFromCamera(normalizedMouse, this.camera);
    const intersects = this.rayCaster.intersectObjects(
      this.objectGroups.flatMap((group) => group.children)
    );
    if (intersects.length === 0) return;
    const selectedObject = intersects[0].object;
    const selectedGroup = this.objectGroups.find((group) =>
      group.children.includes(selectedObject)
    );
    if (selectedGroup) {
      this.animateRotation(selectedGroup);
    }
  }

  onKeyDown(keyEvent) {
    if (!this.isAnimating && keyEvent.key === " " && this.objectGroups) {
      this.animateRotation(this.objectGroups);
    }
  }

  onResize() {
    if (!this.renderer || !this.camera) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer.setSize(
      this.width - ThreeApp.RENDERER_PARAM.rendererRatio,
      this.height - ThreeApp.RENDERER_PARAM.rendererRatio
    );
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * 指定されたオブジェクトを目標角度までアニメーションで回転させる関数
   * @param {THREE.Group|THREE.Group[]} objects - 回転させる対象のオブジェクトまたはオブジェクトの配列
   */
  animateRotation(objects) {
    if (this.isAnimating) return;
    this.isAnimating = true;

    // 引数が配列でない場合は単一のオブジェクトを配列に変換
    if (!Array.isArray(objects)) {
      objects = [objects];
    }

    // オブジェクトの初期回転角度を取得し配列に保存
    const initialRotations = objects.map((object) => object.rotation.y);

    // 単一のオブジェクトを回転させるPromiseを返す関数
    const rotateObject = (object, initialRotation) => {
      return new Promise((resolve) => {
        const duration = 50; // アニメーションの時間（ミリ秒）
        // アニメーションの開始時間
        // NOTE: Performance:now()メソッド https://developer.mozilla.org/ja/docs/Web/API/Performance/now
        const startTime = performance.now();

        // アニメーションフレームごとに呼び出される関数
        const animate = (currentTime) => {
          if (this.isDisposed) {
            resolve();
            return;
          }
          const elapsedTime = currentTime - startTime; // 経過時間
          const progress = Math.min(elapsedTime / duration, 1); // アニメーションの進行度（0から1の範囲）
          object.rotation.y = initialRotation + progress * Math.PI; // 現在の回転角度を設定

          // アニメーションがまだ完了していない場合、次のフレームをリクエスト
          if (progress < 1) {
            this.rotationFrameId = requestAnimationFrame(animate);
          } else {
            // アニメーションが完了した場合、Promiseを解決
            resolve();
          }
        };

        // 最初のアニメーションフレームをリクエスト
        this.rotationFrameId = requestAnimationFrame(animate);
      });
    };

    // 各オブジェクトを順番に回転させる非同期関数
    const animateSequentially = async () => {
      // NOTE: Object.entries() https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/entries
      // NOTE: for...inとfor...ofの違い  https://qiita.com/a05kk/items/d6f49ca5bd15f045ea6c
      for (const [index, object] of objects.entries()) {
        // 前のオブジェクトの回転が完了するまで待つ
        await rotateObject(object, initialRotations[index]);
      }
      this.isAnimating = false;
    };

    animateSequentially();
  }

  /**
   * 初期化処理
   */
  init() {
    // レンダラー
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(
      this.width - ThreeApp.RENDERER_PARAM.rendererRatio,
      this.height - ThreeApp.RENDERER_PARAM.rendererRatio
    );
    this.wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();

    // カメラ
    this.aspect = this.width / this.height;
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      this.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    // グループ
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // 各ポリゴンの間隔
    const spacingX = 12.0; // X方向の間隔
    const spacingY = 12.0; // Y方向の間隔

    // グリッドのサイズを決定
    const gridWidth = 5; // X方向のグリッドの数
    const gridHeight = 3; // Y方向のグリッドの数

    // グリッドの中心を原点にするためのオフセット
    const offsetX = ((gridWidth - 1) * spacingX) / 2;
    const offsetY = ((gridHeight - 1) * spacingY) / 2;

    this.planeMeshArray = [];
    this.objectGroups = [];
    const planeGeometry = new THREE.PlaneGeometry(11.0, 11.0);

    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 3; j++) {
        const subGroup = new THREE.Group();
        // サブグループの位置を設定（位置の軸を設定）
        subGroup.position.set(i * spacingX - offsetX, j * spacingY - offsetY, 0);

        const index = i * 3 + j; // インデックス計算

        // テクスチャ用板ポリゴン（前面）
        const frontPlaneMaterial = new THREE.MeshBasicMaterial({
          map: this.frontTextures[index],
          side: THREE.FrontSide,
        });
        const frontPlaneMesh = new THREE.Mesh(planeGeometry, frontPlaneMaterial);
        frontPlaneMesh.position.z = 0.25;
        subGroup.add(frontPlaneMesh);

        // テクスチャ用板ポリゴン（背面）
        const backPlaneMaterial = new THREE.MeshBasicMaterial({
          map: this.backTextures[index],
          side: THREE.BackSide,
        });
        const backPlaneMesh = new THREE.Mesh(planeGeometry, backPlaneMaterial);
        backPlaneMesh.position.z = -0.25;
        subGroup.add(backPlaneMesh);

        this.objectGroups.push(subGroup);
        this.scene.add(subGroup);

        const planes = {
          frontPlane: frontPlaneMesh,
          backPlane: backPlaneMesh,
        };
        this.planeMeshArray.push(planes);
      }
    }
    this.isAnimating = false;
  }

  /**
   * アセット（素材）のロードを行う Promise
   */
  load() {
    this.frontTextures = [];
    this.backTextures = [];
    const textureLoader = new THREE.TextureLoader();
    const promises = [];

    for (let i = 0; i < 15; i++) {
      const frontTexturePath = `/vol4/light/${i}.webp`;
      const backTexturePath = `/vol4/flower/${i}.webp`;

      promises.push(
        textureLoader.loadAsync(frontTexturePath).then((texture) => {
          if (this.isDisposed) {
            texture.dispose();
            return;
          }
          this.frontTextures[i] = texture;
        })
      );
      promises.push(
        textureLoader.loadAsync(backTexturePath).then((texture) => {
          if (this.isDisposed) {
            texture.dispose();
            return;
          }
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(-1, 1);
          this.backTextures[i] = texture;
        })
      );
    }

    return Promise.all(promises);
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループ
    this.animationFrameId = requestAnimationFrame(this.render);

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.isDisposed = true;
    cancelAnimationFrame(this.animationFrameId);
    cancelAnimationFrame(this.rotationFrameId);
    window.removeEventListener("click", this.onClick, false);
    window.removeEventListener("keydown", this.onKeyDown, false);
    window.removeEventListener("resize", this.onResize, false);
    this.frontTextures?.forEach((texture) => texture?.dispose());
    this.backTextures?.forEach((texture) => texture?.dispose());
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
  }
}
