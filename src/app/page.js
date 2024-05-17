"use client";
import { useEffect } from "react";
import * as THREE from "@/lib/threeJs/three.module.js";
import { OrbitControls } from "@/lib/threeJs/OrbitControls.js";

export default function Home() {
  useEffect(() => {
    const { innerHeight: height, innerWidth: width } = window;
    const wrapper = document.querySelector("#webgl");
    const app = new ThreeApp(wrapper, width, height);
    app.render();

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
  static CAMERA_PARAM = {
    fovy: 60,
    near: 0.1,
    far: 10.0,
    position: new THREE.Vector3(0.0, 2.0, 5.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };

  static RENDERER_PARAM = {
    clearColor: "#0c0a09",
    rendererRatio: 120,
  };
  /**
   * 平行光源定義のための定数
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

  static MATERIAL_PARAM = {
    color: 0x6699ff, // マテリアルの色
  };

  renderer; // レンダラ
  scene; // シーン
  camera; // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight; // アンビエントライト
  tubularSegments; // チューブの分割数
  radialSegments; // パイプの分割数
  currentP; // p の値
  currentQ; // q の値
  box; // ボックスメッシュ
  controls; // オービットコントロール
  axesHelper; // 軸ヘルパー
  isDown; // キーの押下状態用フラグ

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
    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity
    );
    this.scene.add(this.ambientLight);

    this.geometry = new THREE.TorusKnotGeometry(1, 0.4, 50, 16);
    // マテリアル
    this.material = new THREE.MeshNormalMaterial({
      color: ThreeApp.MATERIAL_PARAM,
    });
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

    this.tubularSegments = 64;
    this.radialSegments = 8;
    this.currentP = 2;
    this.currentQ = 3;

    // キーの押下や離す操作を検出できるようにする
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
        this.isDown = false;
      },
      false
    );
  }

  render() {
    requestAnimationFrame(this.render);
    this.controls.update();
    this.box.rotation.y += 0.008;
    this.box.rotation.x += -0.008;

    if (this.isDown === true) {
      this.scene.remove(this.box);
      this.box.geometry.dispose();
      this.box.material.dispose();

      this.tubularSegments = Math.floor(Math.random() * 301);
      if (this.tubularSegments < 3) this.tubularSegments = 64;

      this.radialSegments = Math.floor(Math.random() * 20);
      if (this.radialSegments < 3) this.radialSegments = 8;

      this.currentP = Math.random() * 50;
      if (this.currentP === 0) this.currentP = 2;

      this.currentQ = Math.random() * 50;
      if (this.currentQ === 0) this.currentQ = 2;

      this.geometry = new THREE.TorusKnotGeometry(
        1,
        0.4,
        this.tubularSegments,
        this.radialSegments,
        this.currentP,
        this.currentQ
      );
      this.box = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.box);
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
