"use client";
import { useEffect } from "react";
import * as THREE from "@/lib/threeJs/three.module.js";
import Stats from "@/lib/threeJs/stats.module.js";
import { OrbitControls } from "@/lib/threeJs/OrbitControls.js";
import {
  GodRaysFakeSunShader,
  GodRaysDepthMaskShader,
  GodRaysCombineShader,
  GodRaysGenerateShader,
} from "@/lib/threeJs/GodRaysShader.js";
import { on } from "events";

export default function Page() {
  useEffect(() => {
    const { innerHeight: height, innerWidth: width } = window;
    // ラッパー要素の取得
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
    far: 3000,
    // カメラの座標
    position: new THREE.Vector3(20, 10, 32), // カメラ位置を調整
    // カメラの注視点
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
    screenSpacePosition: new THREE.Vector3(),
    sunPosition: new THREE.Vector3(0, 1000, -1000),
    clipPosition: new THREE.Vector4(),
  };
  /**
   * レンダラー定義のための定数
   * NOTE: width, heightは引数の値を使用する
   */
  static RENDERER_PARAM = {
    clearColor: 0xffffff, // 画面をクリアする色
    rendererRatio: 120, // レンダラーの比率
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff, // 光の色
    intensity: 0.3, // 光の強度
    position: new THREE.Vector3(0, 20, 0), // 光の向き
    shadow: {
      near: 1,
      far: 100,
      right: 10,
      left: -10,
      top: 10,
      bottom: -10,
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
    position: { x: 20, y: 30, z: 30 },
    angle: Math.PI / 5,
    penumbra: 0.2,
    castShadow: true,
    shadowMapSize: { width: 2048, height: 2048 },
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0x000000,
  };

  static GOD_RAY_RENDER_TARGET_RESOLUTION_MULTIPLAYER = 1.0 / 4.0;

  static GOD_RAY_COLOR = {
    bgColor: 0x000511,
    sunColor: 0xffee00,
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
  rotationDirection; // 回転方向
  stats; // ステータス
  postprocessing = { enabled: true }; // ポストプロセシングの有効化
  wrapper; // canvas 要素を append する親要素

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   * @param {number} width - レンダラーに設定する幅
   * @param {number} height - レンダラーに設定する高さ
   */
  constructor(wrapper, width, height) {
    this.wrapper = wrapper;
    this.width = width;
    this.height = height;
    this.init();
    this.animation();
  }

  init() {
    // レンダラ
    const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(color);
    this.renderer.setSize(
      this.width - ThreeApp.RENDERER_PARAM.rendererRatio,
      this.height - ThreeApp.RENDERER_PARAM.rendererRatio
    );
    this.wrapper.appendChild(this.renderer.domElement);
    // TODO:する必要があるのか？ レンダラーの自動クリアを無効にする
    // this.renderer.autoClear = false;

    // シーン
    this.scene = new THREE.Scene();

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
    const axesBarLength = 50.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    // カメラ
    this.aspect = this.width / this.height;
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      this.aspect,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far
    );
    // this.camera.position.z = 200;
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

    // マテリアル
    this.material = new THREE.MeshToonMaterial(ThreeApp.MATERIAL_PARAM);

    // ジオメトリー
    const baseGeometry = new THREE.CylinderGeometry(0.8, 6, 3, 64);
    const shaftGeometry = new THREE.CylinderGeometry(0.8, 0.8, 15, 64);
    const armGeometry = new THREE.CapsuleGeometry(0.8, 4, 32, 64);

    this.rotationDirection = 1; // 初期の回転方向

    // カスタムジオメトリで羽を作成
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0);
    bladeShape.lineTo(7, 0.5);
    bladeShape.quadraticCurveTo(6, 3, 3, 1.5);

    const extrudeSettings = {
      steps: 2,
      depth: 0.2,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
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
    this.bladesGroup.position.set(0, 7.5, 4);

    // ベース、シャフト、アームメッシュの作成とシーンへの追加
    const baseMesh = new THREE.Mesh(baseGeometry, this.material);
    const shaftMesh = new THREE.Mesh(shaftGeometry, this.material);
    const armMesh = new THREE.Mesh(armGeometry, this.material);

    baseMesh.position.y = -6;
    armMesh.position.y = 7.5;
    armMesh.position.z = 2;
    armMesh.rotateX(Math.PI / 2);

    this.scene.add(baseMesh);
    this.scene.add(shaftMesh);
    this.group.add(armMesh);
    this.group.add(this.bladesGroup);

    // コントロールの設定
    // domElementとは、レンダラーのdomElementを指す
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // ズームの有効化
    this.controls.minDistance = 50;
    // ズームの最大距離
    this.controls.maxDistance = 500;

    this.stats = new Stats();
    this.wrapper.appendChild(this.stats.dom);

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

    // window.addEventListener(
    //   "resize",
    //   () => {
    //     this.renderer.setSize(width, height);
    //     this.camera.aspect = this.aspect;
    //     this.camera.updateProjectionMatrix();
    //   },
    //   false
    // );
    window.addEventListener("resize", () => this.onWindowResize.bind(this));
    //ポストプロセシングの初期化
    this.initPostprocessing(this.width, this.height);
  }

  onWindowResize() {
    const renderTargetWidth = this.width;
    const renderTargetHeight = this.height;

    this.camera.aspect = renderTargetWidth / renderTargetHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(renderTargetWidth, renderTargetHeight);
    // ポストプロセシングのサイズを変更
    this.postprocessing.rtTextureColors.setSize(
      renderTargetWidth,
      renderTargetHeight
    );
    this.postprocessing.rtTextureDepth.setSize(
      renderTargetWidth,
      renderTargetHeight
    );
    this.postprocessing.rtTextureDepthMask.setSize(
      renderTargetWidth,
      renderTargetHeight
    );
    // ゴッドレイのサイズを変更
    const adjustedWidth =
      renderTargetWidth * ThreeApp.GOD_RAY_RENDER_TARGET_RESOLUTION_MULTIPLAYER;
    const adjustedHeight =
      renderTargetHeight *
      ThreeApp.GOD_RAY_RENDER_TARGET_RESOLUTION_MULTIPLAYER;
    postprocessing.rtTextureGodRays1.setSize(adjustedWidth, adjustedHeight);
    postprocessing.rtTextureGodRays2.setSize(adjustedWidth, adjustedHeight);
  }
  // ポストプロセシングの初期化
  initPostprocessing(renderTargetWidth, renderTargetHeight) {
    this.postprocessing.scene = new THREE.Scene();
    this.postprocessing.camera = new THREE.OrthographicCamera(
      -0.5,
      0.5,
      0.5,
      -0.5,
      -10000,
      10000
    );
    this.postprocessing.rtTextureColors = new THREE.WebGLRenderTarget(
      renderTargetWidth,
      renderTargetHeight,
      { type: THREE.HalfFloatType }
    );
    this.postprocessing.rtTextureDepth = new THREE.WebGLRenderTarget(
      renderTargetWidth,
      renderTargetHeight,
      { type: THREE.HalfFloatType }
    );
    this.postprocessing.rtTextureDepthMask = new THREE.WebGLRenderTarget(
      renderTargetWidth,
      renderTargetHeight,
      { type: THREE.HalfFloatType }
    );

    const adjustedWidth =
      renderTargetWidth * ThreeApp.GOD_RAY_RENDER_TARGET_RESOLUTION_MULTIPLAYER;
    const adjustedHeight =
      renderTargetHeight *
      ThreeApp.GOD_RAY_RENDER_TARGET_RESOLUTION_MULTIPLAYER;
    this.postprocessing.rtTextureGodRays1 = new THREE.WebGLRenderTarget(
      adjustedWidth,
      adjustedHeight,
      { type: THREE.HalfFloatType }
    );
    this.postprocessing.rtTextureGodRays2 = new THREE.WebGLRenderTarget(
      adjustedWidth,
      adjustedHeight,
      { type: THREE.HalfFloatType }
    );

    const godraysCombineShader = GodRaysCombineShader;
    this.postprocessing.godrayCombineUniforms = THREE.UniformsUtils.clone(
      godraysCombineShader.uniforms
    );
    this.postprocessing.materialGodraysCombine = new THREE.ShaderMaterial({
      uniforms: this.postprocessing.godrayCombineUniforms,
      vertexShader: godraysCombineShader.vertexShader,
      fragmentShader: godraysCombineShader.fragmentShader,
    });

    const godraysFakeSunShader = GodRaysFakeSunShader;
    this.postprocessing.godraysFakeSunUniforms = THREE.UniformsUtils.clone(
      godraysFakeSunShader.uniforms
    );
    this.postprocessing.materialGodraysFakeSun = new THREE.ShaderMaterial({
      uniforms: this.postprocessing.godraysFakeSunUniforms,
      vertexShader: godraysFakeSunShader.vertexShader,
      fragmentShader: godraysFakeSunShader.fragmentShader,
    });

    this.postprocessing.godraysFakeSunUniforms.bgColor.value.setHex(
      ThreeApp.GOD_RAY_COLOR.bgColor
    );
    this.postprocessing.godraysFakeSunUniforms.sunColor.value.setHex(
      ThreeApp.GOD_RAY_COLOR.sunColor
    );

    this.postprocessing.godrayCombineUniforms.fGodRayIntensity.value = 0.75;

    this.postprocessing.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 1.0),
      this.postprocessing.materialGodraysGenerate
    );
    this.postprocessing.quad.position.z = -9900;
    this.postprocessing.scene.add(this.postprocessing.quad);
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

  animation() {
    this.stats.begin();
    this.render();
    this.stats.end();
  }
}
