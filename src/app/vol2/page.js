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
     * これを行わないと、再レンダリングのたびに新しいcanvas要素が追加され続けてしまう
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
 * ThreeApp クラス
 * three.js を効率よく扱うために自家製の制御クラスを定義
 */
class ThreeApp {
  /**
   * カメラ定義のための定数
   * NOTE: アスペクト比は引数の値を使用する
   */
  static CAMERA_PARAM = {
    // fovy は Field of View Y のことで、縦方向の視野角を意味する
    fovy: 60,
    /*
     * 描画する空間のニアクリップ面（最近面）
     * 表示するスタートライン
     */
    near: 0.1,
    /*
     * 描画する空間のファークリップ面（最遠面）
     * 表示するエンドライン
     */
    far: 50.0,
    // カメラの座標
    position: new THREE.Vector3(2, 1, 2.2),
    // カメラの注視点
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   * NOTE: width, heightは引数の値を使用する
   */
  static RENDERER_PARAM = {
    clearColor: 0x80cbc4, // 画面をクリアする色
    rendererRatio: 120, // レンダラーの比率
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff, // 光の色
    intensity: 0.3, // 光の強度
    position: new THREE.Vector3(0, 2, 0), // 光の向き
    shadow: {
      near: 1,
      far: 10,
      right: 1,
      left: -1,
      top: 1,
      bottom: -1,
      mapSize: {
        width: 2048,
        height: 2048,
      },
    },
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color1: 0xffffff, // 光の色
    color2: 0xbfd4d2, // 光の色
    intensity: 2, // 光の強度
  };
  /**
   * スポットライト定義のための定数
   */
  static SPOT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 20,
    position: { x: 2, y: 3, z: 3 },
    angle: Math.PI / 5,
    penumbra: 0.2,
    castShadow: true,
    shadowMapSize: { width: 2048, height: 2048 },
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0xfce4ec,
  };

  renderer; // レンダラ
  scene; // シーン
  camera; // カメラ
  aspect; // アスペクト比
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight; // アンビエントライト
  spotLight; // スポットライト
  material; // マテリアル
  controls; // オービットコントロール
  isDown; // キーの押下状態用フラグ
  group; // グループ
  bladesGroup; // 羽グループ
  rotationDirection;

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   * @param {number} width - レンダラーに設定する幅
   * @param {number} height - レンダラーに設定する高さ
   */
  constructor(wrapper, width, height) {
    // レンダラ
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

    // 平行光源（ディレクショナルライト）
    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.copy(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.position
    );
    this.scene.add(this.directionalLight);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.HemisphereLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color1,
      ThreeApp.AMBIENT_LIGHT_PARAM.color2,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity
    );
    this.scene.add(this.ambientLight);

    // スポットライト
    this.spotLight = new THREE.SpotLight(
      ThreeApp.SPOT_LIGHT_PARAM.color,
      ThreeApp.SPOT_LIGHT_PARAM.intensity
    );
    this.spotLight.position.copy(ThreeApp.SPOT_LIGHT_PARAM.position);
    this.spotLight.angle = ThreeApp.SPOT_LIGHT_PARAM.angle;
    this.spotLight.penumbra = ThreeApp.SPOT_LIGHT_PARAM.penumbra;
    this.spotLight.castShadow = ThreeApp.SPOT_LIGHT_PARAM.castShadow;
    Object.assign(
      this.spotLight.shadow.mapSize,
      ThreeApp.SPOT_LIGHT_PARAM.shadowMapSize
    );
    this.scene.add(this.spotLight);

    // 軸ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    // マテリアル
    this.material = new THREE.MeshToonMaterial(ThreeApp.MATERIAL_PARAM);

    // ジオメトリー
    const baseGeometry = new THREE.CylinderGeometry(0.08, 0.6, 0.3, 64);
    const shaftGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 64);
    const armGeometry = new THREE.CapsuleGeometry(0.08, 0.4, 32, 64);

    this.rotationDirection = 1; // 初期の回転方向

    // カスタムジオメトリで羽を作成
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0);
    bladeShape.lineTo(0.7, 0.05);
    bladeShape.quadraticCurveTo(0.6, 0.3, 0.3, 0.15);

    const extrudeSettings = {
      steps: 2,
      depth: 0.02,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 1,
    };

    const bladeGeometry = new THREE.ExtrudeGeometry(
      bladeShape,
      extrudeSettings
    );

    // グループ
    this.group = new THREE.Group();
    this.scene.add(this.group);
    // 羽グループの作成
    this.bladesGroup = new THREE.Group();

    // 羽を作成し、羽グループに追加
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(bladeGeometry, this.material);
      blade.rotation.z = i * ((2 * Math.PI) / 3); // 120度ずつ回転
      this.bladesGroup.add(blade);
    }

    // 羽グループを所定の位置に配置
    this.bladesGroup.position.set(0, 0.75, 0.4);

    // ベース、シャフト、アームメッシュの作成とシーンへの追加
    const baseMesh = new THREE.Mesh(baseGeometry, this.material);
    const shaftMesh = new THREE.Mesh(shaftGeometry, this.material);
    const armMesh = new THREE.Mesh(armGeometry, this.material);

    baseMesh.position.y = -0.6;
    armMesh.position.y = 0.75;
    armMesh.position.z = 0.2;
    armMesh.rotateX(Math.PI / 2);

    this.scene.add(baseMesh);
    this.scene.add(shaftMesh);
    this.group.add(armMesh);
    this.group.add(this.bladesGroup);

    // コントロールの設定
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // thisのバインド
    this.render = this.render.bind(this);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

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
    window.addEventListener(
      "resize",
      () => {
        this.renderer.setSize(width, height);
        this.camera.aspect = this.aspect;
        this.camera.updateProjectionMatrix();
      },
      false
    );
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループの設定
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    // フラグに応じてオブジェクトの状態を変化させる
    if (this.isDown === true) {
      this.bladesGroup.rotation.z += 0.6;
      this.group.rotation.y += 0.01 * this.rotationDirection;

      // 回転角度が一定範囲を超えたら方向を反転する
      if (this.group.rotation.y >= 1.2 || this.group.rotation.y <= -1.2) {
        this.rotationDirection *= -1;
      }
    }

    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
