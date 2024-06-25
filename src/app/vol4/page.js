"use client";
import { useEffect, useRef } from "react";
import * as THREE from "@/lib/threeJs/three.module.js";
import { OrbitControls } from "@/lib/threeJs/OrbitControls.js";

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
    far: 50.0,
    position: new THREE.Vector3(0.0, 2.0, 12.0),
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
    color: 0xffffff,
    intensity: 1.0,
    position: new THREE.Vector3(1.0, 1.0, 1.0),
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 0.1,
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0xffffff,
  };
  /**
   * レイが交差した際のマテリアル定義のための定数 @@@
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
  material; // マテリアル
  hitMaterial; // レイが交差した際のマテリアル @@@
  torusGeometry; // トーラスジオメトリ
  torusArray; // トーラスメッシュの配列
  texture; // テクスチャ
  controls; // オービットコントロール
  axesHelper; // 軸ヘルパー
  isDown; // キーの押下状態用フラグ
  group; // グループ
  raycaster; // レイキャスター @@@

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

    // Raycaster のインスタンスを生成する @@@
    this.raycaster = new THREE.Raycaster();
    // マウスのクリックイベントの定義 @@@
    window.addEventListener(
      "click",
      (mouseEvent) => {
        // スクリーン空間の座標系をレイキャスター用に正規化する（-1.0 ~ 1.0 の範囲）
        const x = (mouseEvent.clientX / this.width) * 2.0 - 1.0;
        const y = (mouseEvent.clientY / this.height) * 2.0 - 1.0;
        // スクリーン空間は上下が反転している点に注意（Y だけ符号を反転させる）
        const v = new THREE.Vector2(x, -y);
        // レイキャスターに正規化済みマウス座標とカメラを指定する
        this.raycaster.setFromCamera(v, this.camera);
        // scene に含まれるすべてのオブジェクト（ここでは Mesh）を対象にレイキャストする
        const intersects = this.raycaster.intersectObjects(this.torusArray);
        // レイが交差しなかった場合を考慮し一度マテリアルを通常時の状態にリセットしておく
        this.torusArray.forEach((mesh) => {
          mesh.material = this.material;
        });

        if (intersects.length > 0) {
          intersects[0].object.material = this.hitMaterial;
        }
      },
      false
    );

    // キーの押下や離す操作を検出できるようにする
    window.addEventListener(
      "keydown",
      (keyEvent) => {
        switch (keyEvent.key) {
          case " ":
            this.isDown = true;
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

    // フォグ
    this.scene.fog = new THREE.Fog(
      ThreeApp.FOG_PARAM.color,
      ThreeApp.FOG_PARAM.near,
      ThreeApp.FOG_PARAM.far
    );

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

    // ディレクショナルライト（平行光源）
    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.copy(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.position
    );
    this.scene.add(this.directionalLight);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity
    );
    this.scene.add(this.ambientLight);

    // マテリアル
    this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    this.material.map = this.texture;
    // 交差時に表示するためのマテリアルを定義 @@@
    this.hitMaterial = new THREE.MeshPhongMaterial(
      ThreeApp.INTERSECTION_MATERIAL_PARAM
    );
    this.hitMaterial.map = this.texture;

    // グループ
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // トーラスメッシュ
    const torusCount = 10;
    const transformScale = 5.0;
    this.torusGeometry = new THREE.TorusGeometry(0.5, 0.2, 8, 16);
    this.torusArray = [];
    for (let i = 0; i < torusCount; ++i) {
      const torus = new THREE.Mesh(this.torusGeometry, this.material);
      torus.position.x = (Math.random() * 2.0 - 1.0) * transformScale;
      torus.position.y = (Math.random() * 2.0 - 1.0) * transformScale;
      torus.position.z = (Math.random() * 2.0 - 1.0) * transformScale;
      this.group.add(torus);
      this.torusArray.push(torus);
    }

    // 軸ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // キーの押下状態を保持するフラグ
    this.isDown = false;
  }

  /**
   * アセット（素材）のロードを行う Promise
   */
  load() {
    return new Promise((resolve) => {
      const imagePath = "./sphere.jpg";
      const loader = new THREE.TextureLoader();
      loader.load(imagePath, (texture) => {
        this.texture = texture;
        resolve();
      });
    });
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループ
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    // フラグに応じてオブジェクトの状態を変化させる
    if (this.isDown === true) {
      this.group.rotation.y += 0.05;
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
