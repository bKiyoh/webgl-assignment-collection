"use client";
import { useEffect } from "react";
import * as THREE from "@/lib/threeJs/three.module.js";

export default function Page() {
  useEffect(() => {
    const { innerHeight: height, innerWidth: width } = window;
    const wrapper = document.querySelector("#webgl");
    const app = new ThreeApp(wrapper, width, height);
    app.render();

    /**
     * クリーンアップ関数の追加
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
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0x3399ff,
  };
  renderer; // レンダラ
  scene; // シーン
  camera; // カメラ
  geometry; // ジオメトリ
  material; // マテリアル
  box; // ボックスメッシュ

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

    this.scene = new THREE.Scene();

    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far
    );
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    this.geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    this.material = new THREE.MeshBasicMaterial(ThreeApp.MATERIAL_PARAM);

    this.box = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.box);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
