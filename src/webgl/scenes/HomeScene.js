import {
  Color,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  TorusKnotGeometry,
  Vector3,
  WebGLRenderer,
} from "@/lib/threeJs/three.module.js";
import { OrbitControls } from "@/lib/threeJs/OrbitControls.js";

const THREE = {
  Color,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  TorusKnotGeometry,
  Vector3,
  WebGLRenderer,
};

/**
 * ThreeApp クラス
 * three.js を効率よく扱うために自家製の制御クラスを定義
 */
export default class ThreeApp {
  /**
   * カメラ定義のための定数
   * NOTE: アスペクト比は引数の値を使用する
   */
  static CAMERA_PARAM = {
    fovy: 60,
    near: 0.1,
    far: 50.0,
    position: new THREE.Vector3(0.0, 0.0, 5.0),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   * NOTE: width, heightは引数の値を使用する
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

    // ジオメトリ
    this.geometry = new THREE.TorusKnotGeometry(1, 0.4, 50, 16);

    // マテリアル
    this.material = new THREE.MeshBasicMaterial(ThreeApp.MATERIAL_PARAM);

    // メッシュ
    this.box = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.box);

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // this のバインド
    this.render = this.render.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onResize = this.onResize.bind(this);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

    this.tubularSegments = ThreeApp.GEOMETRY_PARAM.tubularSegments;
    this.radialSegments = ThreeApp.GEOMETRY_PARAM.radialSegments;
    this.currentP = ThreeApp.GEOMETRY_PARAM.p;
    this.currentQ = ThreeApp.GEOMETRY_PARAM.q;

    // キーの押下や離す操作を検出できるようにする
    window.addEventListener("keydown", this.onKeyDown, false);
    window.addEventListener("keyup", this.onKeyUp, false);
    window.addEventListener("resize", this.onResize, false);
  }

  onKeyDown(keyEvent) {
    if (keyEvent.key === " ") {
      this.isDown = true;
    }
  }

  onKeyUp() {
    this.isDown = false;
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(
      width - ThreeApp.RENDERER_PARAM.rendererRatio,
      height - ThreeApp.RENDERER_PARAM.rendererRatio
    );
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.animationFrameId = requestAnimationFrame(this.render);
    this.controls.update();

    if (this.isDown === true) {
      // マウスが押されている場合の処理を開始
      this.box.geometry.dispose(); // 現在のボックスのジオメトリを破棄

      // ランダムなパラメータを生成
      this.tube = Math.random() * 0.6;
      this.tubularSegments = Math.floor(Math.random() * 301);
      this.radialSegments = Math.floor(Math.random() * 20);
      this.currentP = Math.random() * 50;
      this.currentQ = Math.random() * 50;

      // tubularSegmentsが3未満の場合、デフォルト値を使用
      if (this.tubularSegments < 3)
        this.tubularSegments = ThreeApp.GEOMETRY_PARAM.tubularSegments;
      // radialSegmentsが3未満の場合、デフォルト値を使用
      if (this.radialSegments < 3)
        this.radialSegments = ThreeApp.GEOMETRY_PARAM.radialSegments;
      // currentPが0の場合、デフォルト値を使用
      if (this.currentP === 0) this.currentP = ThreeApp.GEOMETRY_PARAM.p;
      // currentQが0の場合、デフォルト値を使用
      if (this.currentQ === 0) this.currentQ = ThreeApp.GEOMETRY_PARAM.q;

      // 新しいTorusKnotGeometryを生成
      this.geometry = new THREE.TorusKnotGeometry(
        1,
        this.tube,
        this.tubularSegments,
        this.radialSegments,
        this.currentP,
        this.currentQ
      );
      // 既存メッシュのジオメトリだけを差し替える
      this.box.geometry = this.geometry;
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener("keydown", this.onKeyDown, false);
    window.removeEventListener("keyup", this.onKeyUp, false);
    window.removeEventListener("resize", this.onResize, false);
    this.controls.dispose();
    this.box.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
