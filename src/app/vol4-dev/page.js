"use client";
import { useEffect, useRef } from "react";
import * as THREE from "@/lib/threeJs/three.module.js";
import { OrbitControls } from "@/lib/threeJs/OrbitControls.js";
import { GLTFLoader } from "@/lib/threeJs/GLTFLoader";

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
    far: 1000.0,
    position: new THREE.Vector3(0.0, 50.0, 200.0),
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
    position: new THREE.Vector3(50.0, 50.0, 50.0),
  };
  /**
   * 影に関する定数の定義
   */
  static SHADOW_PARAM = {
    spaceSize: 100.0, // 影を生成するためのカメラの空間の広さ
    mapSize: 512, // 影を生成するためのバッファのサイズ
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 0.1,
  };
  /**
   * マテリアルのパラメータ
   */
  static MATERIAL_PARAM = {
    color: 0xffffff,
  };

  wrapper; // canvasの親要素
  width; // 画面幅
  height; // 画面高さ
  renderer; // レンダラ
  scene; // シーン
  camera; // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight; // 環境光（アンビエントライト）
  controls; // オービットコントロール
  axesHelper; // 軸ヘルパー
  gltf; // 読み込んだ glTF 格納用
  mixer; // アニメーションミキサー
  actions; // アニメーションのアクション
  clock; // アニメーション用のクロック
  plane; // 床面用プレーン @@@
  cameraHelper; // 影のデバッグ用ヘルパー @@@

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   * @param {String} width
   * @param {String} height
   */
  constructor(wrapper, width, height) {
    this.wrapper = wrapper;
    this.width = width;
    this.height = height;
    this.render = this.render.bind(this);

    // ウィンドウのリサイズを検出できるようにする
    window.addEventListener(
      "resize",
      () => {
        this.renderer.setSize(
          this.width - ThreeApp.RENDERER_PARAM.rendererRatio,
          this.height - ThreeApp.RENDERER_PARAM.rendererRatio
        );
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
    // レンダラの設定
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(
      this.width - ThreeApp.RENDERER_PARAM.rendererRatio,
      this.height - ThreeApp.RENDERER_PARAM.rendererRatio
    );
    this.wrapper.appendChild(this.renderer.domElement);

    // レンダラーで影を描画するための機能を有効化する @@@
    this.renderer.shadowMap.enabled = true;

    // レンダラーに対しては影の描画アルゴリズムを指定できる @@@
    // ※ちなみに既定値は THREE.PCFShadowMap なので、以下は省略可
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // シーンの設定
    this.scene = new THREE.Scene();

    // カメラの設定
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

    // ディレクショナルライトが影を落とすように設定する @@@
    this.directionalLight.castShadow = true;

    // 影用のカメラ（平行投影のカメラ）は必要に応じて範囲を広げる @@@
    this.directionalLight.shadow.camera.top = ThreeApp.SHADOW_PARAM.spaceSize;
    this.directionalLight.shadow.camera.bottom =
      -ThreeApp.SHADOW_PARAM.spaceSize;
    this.directionalLight.shadow.camera.left = -ThreeApp.SHADOW_PARAM.spaceSize;
    this.directionalLight.shadow.camera.right = ThreeApp.SHADOW_PARAM.spaceSize;

    // 影用のバッファのサイズは変更することもできる @@@
    this.directionalLight.shadow.mapSize.width = ThreeApp.SHADOW_PARAM.mapSize;
    this.directionalLight.shadow.mapSize.height = ThreeApp.SHADOW_PARAM.mapSize;

    // ライトの設定を可視化するためにヘルパーを使う @@@
    this.cameraHelper = new THREE.CameraHelper(
      this.directionalLight.shadow.camera
    );
    this.scene.add(this.cameraHelper);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity
    );
    this.scene.add(this.ambientLight);

    // シーンに glTF を追加
    this.scene.add(this.gltf.scene);

    // glTF の階層構造をたどり、Mesh が出てきたら影を落とす（cast）設定を行う @@@
    this.gltf.scene.traverse((object) => {
      if (object.isMesh === true || object.isSkinnedMesh === true) {
        object.castShadow = true;
      }
    });

    // 床面をプレーンで生成する @@@
    const planeGeometry = new THREE.PlaneGeometry(250.0, 250.0);
    const planeMaterial = new THREE.MeshPhongMaterial();
    this.plane = new THREE.Mesh(planeGeometry, planeMaterial);
    // プレーンは XY 平面に水平な状態なので、後ろに 90 度分倒す
    this.plane.rotation.x = -Math.PI * 0.5;

    // 床面は、影を受ける（receive）するよう設定する @@@
    this.plane.receiveShadow = true;

    // シーンに追加
    this.scene.add(this.plane);

    // 軸ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    // アニメーション時間管理のための Clock オブジェクトを生成しておく @@@
    this.clock = new THREE.Clock();

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
  }

  /**
   * アセット（素材）のロードを行う Promise
   */
  load() {
    return new Promise((resolve) => {
      // 読み込むファイルのパス
      const gltfPath = "/vol4-dev/Fox.glb";
      const loader = new GLTFLoader();
      loader.load(gltfPath, (gltf) => {
        // glTF のロードが終わったらアニメーション関連の初期化を同時に行う
        this.gltf = gltf;
        this.mixer = new THREE.AnimationMixer(this.gltf.scene);
        const animations = this.gltf.animations;
        this.actions = [];
        for (let i = 0; i < animations.length; ++i) {
          this.actions.push(this.mixer.clipAction(animations[i]));
          this.actions[i].setLoop(THREE.LoopRepeat);
          this.actions[i].play();
          this.actions[i].weight = 0.0;
        }
        this.actions[0].weight = 1.0;
        resolve();
      });
    });
  }

  // 描画処理
  render() {
    requestAnimationFrame(this.render);

    this.controls.update();

    // 前回からの経過時間（デルタ）を取得してミキサーに適用する
    const delta = this.clock.getDelta();
    this.mixer.update(delta);

    this.renderer.render(this.scene, this.camera);
  }
}
