"use client";
import { useEffect } from "react";
import * as THREE from "@/lib/threeJs/three.module.js";
import { OrbitControls } from "@/lib/threeJs/OrbitControls.js";

export default function Page() {
  useEffect(() => {
    const { innerHeight: height, innerWidth: width } = window;
    const wrapper = document.querySelector("#webgl");
    const app = new ThreeApp(wrapper, width, height);
    app.render();

    /**
     * NOTE: クリーンアップ関数
     * この関数は、コンポーネントがアンマウントされる際や、
     * useEffectの依存関係が変わる前に実行される
     *  これを行わないと、再レンダリングのたびに新しいcanvas要素が追加され続けてしまう
     */
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

/**
 * three.js を効率よく扱うために自家製の制御クラスを定義
 */
class ThreeApp {
  /**
   * カメラ定義のための定数
   * aspectは引数の値を使用する
   */
  static CAMERA_PARAM = {
    fovy: 60,
    near: 0.1,
    far: 10.0,
    position: new THREE.Vector3(0.0, 2.0, 5.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   * width, heightは引数の値を使用する
   */
  static RENDERER_PARAM = {
    clearColor: 0x666666, // 画面をクリアする色
    rendererRatio: 120,
  };
  /**
   * 平行光源定義のための定数 @@@
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff, // 光の色
    intensity: 1.0, // 光の強度
    position: new THREE.Vector3(1.0, 1.0, 1.0), // 光の向き
  };
  /**
   * アンビエントライト定義のための定数 @@@
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff, // 光の色
    intensity: 0.1, // 光の強度
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0x3399ff,
  };
  renderer; // レンダラ
  scene; // シーン
  camera; // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight; // アンビエントライト
  geometry; // ジオメトリ
  material; // マテリアル
  box; // ボックスメッシュ
  controls; // オービットコントロール
  axesHelper; // 軸ヘルパー
  isDown; // キーの押下状態用フラグ @@@
  text;

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   * @param {number} width - レンダラーに設定する幅
   * @param {number} height - レンダラーに設定する高さ
   */
  constructor(wrapper, width, height) {
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(
      width - ThreeApp.RENDERER_PARAM.rendererRatio,
      height - ThreeApp.RENDERER_PARAM.rendererRatio
    );
    wrapper.appendChild(this.renderer.domElement);

    // シーン
    this.scene = new THREE.Scene();

    // カメラ
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      aspect,
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
    // NOTE: copyにする理由は、参照渡しではなく値渡しにするため
    this.directionalLight.position.copy(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.position
    );
    this.scene.add(this.directionalLight);
    // アンビエントライト（環境光） @@@
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity
    );
    this.scene.add(this.ambientLight);

    // ジオメトリとマテリアル
    this.geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);
    // this.text =  new THREEvol
    // メッシュ
    this.box = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.box);

    // 軸ヘルパー
    const axesHelper = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesHelper);
    this.scene.add(this.axesHelper);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.render = this.render.bind(this);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

    // キーの押下や離す操作を検出できるようにする @@@
    window.addEventListener(
      "keydown",
      (keyEvent) => {
        // スペースキーが押されている場合はフラグを立てる
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
        // なんらかのキーが離された操作で無条件にフラグを下ろす
        this.isDown = false;
      },
      false
    );
  }

  render() {
    // 恒常ループの設定
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    // フラグに応じてオブジェクトの状態を変化させる @@@
    if (this.isDown === true) {
      // rotation プロパティは Euler クラスのインスタンス
      // XYZ の各軸に対する回転をラジアンで指定する
      this.box.rotation.y += 0.05;
      this.box.rotation.x += -0.025;
      this.box.rotation.z += -0.025;
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
