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
  return (
    <>
      <div id="webgl" />
    </>
  );
}

class ThreeApp {
  /**
   * カメラ定義のための定数
   * aspectは引数の値を使用する
   */
  static CAMERA_PARAM = {
    fovy: 60,
    near: 0.1,
    far: 10.0,
    position: new THREE.Vector3(0.0, 0.0, 5.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   * width, heightは引数の値を使用する
   */
  static RENDERER_PARAM = {
    clearColor: "#0c0a09",
    rendererRatio: 120,
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0x808080,
    wireframe: true,
    opacity: 0.3,
    transparent: true,
  };
  /*
   * ジオメトリ定義のための定数
   */
  static GEOMETRY_PARAM = {
    tube: 1,
    tubularSegments: 64,
    radialSegments: 8,
    p: 2,
    q: 3,
  };

  renderer; // レンダラ
  scene; // シーン
  camera; // カメラ
  aspect; // アスペクト比
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight; // アンビエントライト
  tube; // チューブメッシュ
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
    this.aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      this.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    this.geometry = new THREE.TorusKnotGeometry(1, 0.4, 50, 16);
    // マテリアル
    this.material = new THREE.MeshBasicMaterial({
      color: 0x808080,
      wireframe: true,
      opacity: 0.3,
      transparent: true,
    });

    // メッシュ
    this.box = new THREE.Mesh(this.geometry, this.material);

    this.scene.add(this.box);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.render = this.render.bind(this);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

    this.tubularSegments = ThreeApp.GEOMETRY_PARAM.tubularSegments;
    this.radialSegments = ThreeApp.GEOMETRY_PARAM.radialSegments;
    this.currentP = ThreeApp.GEOMETRY_PARAM.p;
    this.currentQ = ThreeApp.GEOMETRY_PARAM.q;

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
    window.addEventListener(
      "resize",
      () => {
        // レンダラの大きさを設定
        this.renderer.setSize(width, height);
        // カメラが撮影する視錐台のアスペクト比を再設定
        this.camera.aspect = this.aspect;
        // カメラのパラメータが変更されたときは行列を更新する
        this.camera.updateProjectionMatrix();
      },
      false
    );
  }

  render() {
    requestAnimationFrame(this.render);
    this.controls.update();

    if (this.isDown === true) {
      this.scene.remove(this.box);
      this.box.geometry.dispose();
      this.box.material.dispose();

      this.tube = Math.random() * 0.6;
      this.tubularSegments = Math.floor(Math.random() * 301);
      this.radialSegments = Math.floor(Math.random() * 20);
      this.currentP = Math.random() * 50;
      this.currentQ = Math.random() * 50;

      if (this.tubularSegments < 3)
        this.tubularSegments = ThreeApp.GEOMETRY_PARAM.tubularSegments;
      if (this.radialSegments < 3)
        this.radialSegments = ThreeApp.GEOMETRY_PARAM.radialSegments;
      if (this.currentP === 0) this.currentP = ThreeApp.GEOMETRY_PARAM.p;
      if (this.currentQ === 0) this.currentQ = ThreeApp.GEOMETRY_PARAM.q;

      this.geometry = new THREE.TorusKnotGeometry(
        1,
        this.tube,
        this.tubularSegments,
        this.radialSegments,
        this.currentP,
        this.currentQ
      );
      this.box = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.box);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
