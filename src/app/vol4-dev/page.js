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
        console.log("test");
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

    // シーンの設定
    this.scene = new THREE.Scene();

    // オフスクリーン用のシーン @@@
    // 以下、各種オブジェクトやライトはオフスクリーン用のシーンに add しておく
    this.offscreenScene = new THREE.Scene();

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
    this.offscreenScene.add(this.directionalLight);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity
    );
    this.offscreenScene.add(this.ambientLight);

    // シーンに glTF を追加
    this.offscreenScene.add(this.gltf.scene);

    // 軸ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.offscreenScene.add(this.axesHelper);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // レンダーターゲットをアスペクト比 1.0 の正方形で生成する @@@
    this.renderTarget = new THREE.WebGLRenderTarget(
      ThreeApp.RENDER_TARGET_SIZE,
      ThreeApp.RENDER_TARGET_SIZE
    );

    // オフスクリーン用のカメラは、この時点でのカメラの状態を（使いまわして手間軽減のため）クローンしておく @@@
    this.offscreenCamera = this.camera.clone();
    // ただし、最終シーンがブラウザのクライアント領域のサイズなのに対し……
    // レンダーターゲットは正方形なので、アスペクト比は 1.0 に設定を上書きしておく
    this.offscreenCamera.aspect = 1.0;
    this.offscreenCamera.updateProjectionMatrix();

    // レンダリング結果を可視化するのに、板ポリゴンを使う @@@
    const planeGeometry = new THREE.PlaneGeometry(5.0, 5.0);
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.plane = new THREE.Mesh(planeGeometry, planeMaterial);

    // 板ポリゴンのマテリアルには、レンダーターゲットに描き込まれた結果を投影したいので……
    // マテリアルの map プロパティにレンダーターゲットのテクスチャを割り当てておく @@@
    planeMaterial.map = this.renderTarget.texture;

    // 板ポリゴンをシーンに追加
    this.scene.add(this.plane);

    // 背景色を出し分けるため、あらかじめ Color オブジェクトを作っておく @@@
    this.blackColor = new THREE.Color(0x000000);
    this.whiteColor = new THREE.Color(0xffffff);
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

    // オフスクリーンレンダリングがリアルタイムであることをわかりやすくするため……
    // Duck には絶えず動いておいてもらう @@@
    this.gltf.scene.rotation.y += 0.01;

    // まず最初に、オフスクリーンレンダリングを行う @@@
    this.renderer.setRenderTarget(this.renderTarget);
    // オフスクリーンレンダリングは常に固定サイズ
    this.renderer.setSize(
      ThreeApp.RENDER_TARGET_SIZE,
      ThreeApp.RENDER_TARGET_SIZE
    );
    // わかりやすくするために、背景を黒にしておく
    this.renderer.setClearColor(this.blackColor, 1.0);
    // オフスクリーン用のシーン（Duck が含まれるほう）を描画する
    this.renderer.render(this.offscreenScene, this.offscreenCamera);

    // 次に最終的な画面の出力用のシーンをレンダリングするため null を指定しもとに戻す @@@
    this.renderer.setRenderTarget(null);
    // 最終的な出力はウィンドウサイズ
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // わかりやすくするために、背景を白にしておく
    this.renderer.setClearColor(this.whiteColor, 1.0);
    // 板ポリゴンが１枚置かれているだけのシーンを描画する
    this.renderer.render(this.scene, this.camera);
  }
}
