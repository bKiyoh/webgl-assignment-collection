"use client";
import { useEffect, useRef } from "react";
import { OrbitControls } from "@/lib/threeJs/OrbitControls.js";

import * as THREE from "@/lib/threeJs/three.module.js";
import { resolve } from "path";

export default function Page() {
  const initializedRef = useRef(false);

  // ThreeAppの初期化とロードを行う関数
  const initAndLoad = async (app) => {
    await app.load();
    app.init();
    app.render();
  };

  useEffect(() => {
    const { innerHeight: height, innerWidth: width } = window;
    const wrapper = document.querySelector("#webgl");
    if (wrapper && !initializedRef.current) {
      const app = new ThreeApp(wrapper, width, height);
      initAndLoad(app);
      initializedRef.current = true;
    }

    return () => {
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
    position: new THREE.Vector3(0.0, 0.0, 34.0),
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
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0x0000ff,
    intensity: 1.0,
    position: new THREE.Vector3(1.0, 1.0, 1.0),
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0x0000ff,
    intensity: 0.1,
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0xffffff,
  };
  /**
   * レイが交差した際のマテリアル定義のための定数
   */
  static INTERSECTION_MATERIAL_PARAM = {
    color: 0x00ff00,
  };
  /**
   * フォグの定義のための定数
   */
  static FOG_PARAM = {
    color: 0xffffff,
    near: 15.0,
    far: 25.0,
  };

  wrapper; // canvas の親要素
  renderer; // レンダラ
  scene; // シーン
  camera; // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight; // 環境光（アンビエントライト）
  planeArray; // トーラスメッシュの配列
  texture; // テクスチャ
  frontSideTextureList; // テクスチャ
  backSideTextureList; // テクスチャ
  groupList; // グループ
  rayCaster; // レイキャスター @@@
  plane; // 板ポリゴン @@@
  controls; // オービットコントロール
  isDown;
  isAnimating;

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   */
  constructor(wrapper, width, height) {
    this.wrapper = wrapper;
    this.width = width;
    this.height = height;
    this.render = this.render.bind(this);

    // Raycaster のインスタンスを生成
    this.rayCaster = new THREE.Raycaster();

    // マウスのクリックイベントの定義
    window.addEventListener(
      "click",
      (mouseEvent) => {
        if (this.isAnimating) return;
        // スクリーン空間の座標系をレイキャスター用に正規化する（-1.0 ~ 1.0 の範囲）
        const x = (mouseEvent.clientX / this.width) * 2.0 - 1.0;
        const y = (mouseEvent.clientY / this.height) * 2.0 - 1.0;
        // スクリーン空間は上下が反転している点に注意（Y だけ符号を反転させる）
        const v = new THREE.Vector2(x, -y);
        // レイキャスターに正規化済みマウス座標とカメラを指定する
        this.rayCaster.setFromCamera(v, this.camera);
        // scene に含まれるすべてのオブジェクト（ここでは Mesh）を対象にレイキャストする
        const intersects = this.rayCaster.intersectObjects(
          this.groupList.flatMap((group) => group.children)
        );
        if (intersects.length > 0) {
          const selectedObject = intersects[0].object;
          // サブグループ内のオブジェクトを探して一致するものを取得
          const selectedGroup = this.groupList.find((group) =>
            group.children.includes(selectedObject)
          );
          if (selectedGroup) {
            this.animateRotation(selectedGroup);
          }
        }
      },
      false
    );
    // キーの押下や離す操作を検出できるようにする
    window.addEventListener(
      "keydown",
      (keyEvent) => {
        if (this.isAnimating) return;
        switch (keyEvent.key) {
          case " ":
            this.isDown = true;
            this.animateRotation(this.groupList);
            break;
          default:
        }
      },
      false
    );
    window.addEventListener(
      "keyup",
      (keyEvent) => {
        this.isDown = false;
      },
      false
    );

    // ウィンドウのリサイズを検出できるようにする
    window.addEventListener(
      "resize",
      () => {
        this.renderer.setSize(this.width, this.height);
        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
      },
      false
    );
  }

  /**
   * 指定されたオブジェクトを目標角度までアニメーションで回転させる関数
   * @param {THREE.Group} object - 回転させる対象のオブジェクト
   */
  animateRotation(objects) {
    if (this.isAnimating) return;
    this.isAnimating = true;

    const duration = 500;
    const startTime = performance.now();

    // 配列でない場合は単一のオブジェクトを配列に変換
    if (!Array.isArray(objects)) {
      objects = [objects];
    }

    const initialRotations = objects.map((object) => object.rotation.y);

    return new Promise((resolve) => {
      const animate = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        for (let i = 0; i < objects.length; i++) {
          objects[i].rotation.y = initialRotations[i] + progress * Math.PI;
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.isAnimating = false;
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
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

    this.load().then(() => {
      this.planeArray = [];
      this.groupList = [];

      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 3; j++) {
          const subGroup = new THREE.Group();
          // サブグループの位置を設定（位置の軸を設定）
          subGroup.position.set(
            i * spacingX - offsetX,
            j * spacingY - offsetY,
            0
          );

          // 背景用板ポリゴン
          const boxGeometry = new THREE.BoxGeometry(11.1, 11.1, 0.3);
          const boxMaterial = new THREE.MeshBasicMaterial({
            color: 0xf5f5f5,
          });
          const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
          subGroup.add(boxMesh);

          const index = i * 3 + j; // インデックス計算

          // テクスチャ用板ポリゴン（前面）
          const planeGeometry = new THREE.PlaneGeometry(11.0, 11.0);
          const frontPlaneMaterial = new THREE.MeshBasicMaterial({
            map: this.frontSideTextureList[index],
            side: THREE.FrontSide,
          });
          const frontPlaneMesh = new THREE.Mesh(
            planeGeometry,
            frontPlaneMaterial
          );
          frontPlaneMesh.position.z = 0.5;
          subGroup.add(frontPlaneMesh);

          // テクスチャ用板ポリゴン（背面）
          const backPlaneMaterial = new THREE.MeshBasicMaterial({
            map: this.backSideTextureList[index],
            side: THREE.BackSide,
          });
          const backPlaneMesh = new THREE.Mesh(
            planeGeometry,
            backPlaneMaterial
          );
          backPlaneMesh.position.z = -0.5;
          subGroup.add(backPlaneMesh);

          this.groupList.push(subGroup);
          this.scene.add(subGroup);

          const planes = {
            frontPlane: frontPlaneMesh,
            plane1: boxMesh,
            backPlane: backPlaneMesh,
          };
          this.planeArray.push(planes);
        }
      }
    });

    // オービットコントロールの設定
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // キーの押下状態を保持するフラグ
    this.isDown = false;
    this.isAnimating = false;
  }

  /**
   * アセット（素材）のロードを行う Promise
   */
  load() {
    this.frontSideTextureList = [];
    this.backSideTextureList = [];
    const promises = [];

    for (let i = 0; i < 15; i++) {
      const frontSideImagePath = `/vol4/light/${i}.jpg`;
      const backSideImagePath = `/vol4/flower/${i}.jpg`;
      const loader = new THREE.TextureLoader();
      const frontPromise = new Promise((resolve, reject) => {
        loader.load(
          frontSideImagePath,
          (texture) => {
            this.frontSideTextureList[i] = texture;
            resolve();
          },
          undefined,
          (err) => {
            reject(err);
          }
        );
      });
      const backPromise = new Promise((resolve, reject) => {
        loader.load(
          backSideImagePath,
          (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(-1, 1);
            this.backSideTextureList[i] = texture;
            resolve();
          },
          undefined,
          (err) => {
            reject(err);
          }
        );
      });
      promises.push(frontPromise);
      promises.push(backPromise);
    }
    return Promise.all(promises);
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループ
    requestAnimationFrame(this.render);

    this.controls.update();

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
