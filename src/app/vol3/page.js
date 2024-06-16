"use client";
import { useEffect, useRef } from "react";
import * as THREE from "@/lib/threeJs/three.module.js";
import { OrbitControls } from "@/lib/threeJs/OrbitControls.js";
import { EffectComposer } from "@/lib/threeJs/EffectComposer.js";
import { RenderPass } from "@/lib/threeJs/RenderPass.js";
import { UnrealBloomPass } from "@/lib/threeJs/UnrealBloomPass.js";

export default function Page() {
  const initializedRef = useRef(false);
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

/**
 * ThreeApp クラス
 * three.js を効率よく扱うために自家製の制御クラスを定義
 */
class ThreeApp {
  /**
   * 月に掛けるスケール
   */
  static MOON_SCALE = 0.27;
  /**
   * 月と地球の間の距離
   */
  static MOON_DISTANCE = 1.0;
  /**
   * 人工衛星の移動速度
   */
  static SATELLITE_SPEED = 0.05;
  /**
   * 人工衛星の曲がる力
   */
  static SATELLITE_TURN_SCALE = 0.1;
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
    position: new THREE.Vector3(2, 1, 8),
    // カメラの注視点
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   * NOTE: width, heightは引数の値を使用する
   */
  static RENDERER_PARAM = {
    clearColor: 0x000000, // 画面をクリアする色
    rendererRatio: 120, // レンダラーの比率
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
    intensity: 0.3,
  };
  /**
   * マテリアル定義のための定数
   */
  static MATERIAL_PARAM = {
    color: 0x80cbc4,
  };
  /**
   * フォグの定義のための定数
   */
  static FOG_PARAM = {
    color: 0xffffff,
    near: 10.0,
    far: 20.0,
  };

  wrapper; // canvas の親要素
  width; // 画面幅
  height; // 画面高さ
  renderer; // レンダラ
  scene; // シーン
  camera; // カメラ
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight; // 環境光（アンビエントライト）
  controls; // オービットコントロール
  axesHelper; // 軸ヘルパー
  isDown; // キーの押下状態用フラグ
  clock; // 時間管理用
  sphereGeometry; // ジオメトリ
  earth; // 地球
  earthMaterial; // 地球用マテリアル
  earthTexture; // 地球用テクスチャ
  moon; // 月
  moonMaterial; // 月用マテリアル
  moonTexture; // 月用テクスチャ
  satellite; // 人工衛星
  satelliteMaterial; // 人工衛星用マテリアル
  satelliteDirection; // 人工衛星の進行方向
  group; // グループ
  composer; // エフェクトコンポーザー @@@
  renderPass; // レンダーパス @@@
  glitchPass; // グリッチパス @@@
  mArray;

  /**
   * コンストラクタ
   * @constructor
   * @param {HTMLElement} wrapper - canvas 要素を append する親要素
   * @param {number} width - レンダラーに設定する幅
   * @param {number} height - レンダラーに設定する高さ
   */
  constructor(wrapper, width, height) {
    // 初期化時に canvas を append できるようにプロパティに保持
    this.wrapper = wrapper;
    this.width = width;
    this.height = height;

    // thisのバインド
    this.render = this.render.bind(this);

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
        // なんらかのキーが離された操作で無条件にフラグを下ろす
        this.isDown = false;
      },
      false
    );

    window.addEventListener(
      "resize",
      () => {
        // レンダラの大きさを設定
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // カメラが撮影する視錐台のアスペクト比を再設定
        this.camera.aspect = this.aspect;
        // カメラのパラメータが変更されたときは行列を更新する
        this.camera.updateProjectionMatrix();
      },
      false
    );
  }

  /**
   * アセット（素材）のロードを行う Promise
   */
  load() {
    return new Promise((resolve) => {
      // 地球用画像の読み込みとテクスチャ生成
      const earthPath = "/earth.jpg";
      const moonPath = "/1.jpg";
      const loader = new THREE.TextureLoader();
      loader.load(earthPath, (earthTexture) => {
        // 地球用
        this.earthTexture = earthTexture;
        loader.load(moonPath, (moonTexture) => {
          // 月用
          this.moonTexture = moonTexture;
          resolve();
        });
      });
    });
  }

  /**
   * 初期化処理
   */
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

    // シーン
    this.scene = new THREE.Scene();
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

    // 平行光源（ディレクショナルライト）
    this.directionalLight = new THREE.PointLight(0xffffff, 100);
    this.directionalLight.position.copy(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.position
    );
    this.scene.add(this.directionalLight);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.HemisphereLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity
    );
    this.scene.add(this.ambientLight);

    // 球体のジオメトリを生成
    this.sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);

    // 地球のマテリアルとメッシュ
    this.earthMaterial = new THREE.MeshBasicMaterial({ color: 0xd6a3dc });
    this.earthMaterial.map = this.moonTexture;
    this.earth = new THREE.Mesh(this.sphereGeometry, this.earthMaterial);
    this.scene.add(this.earth);

    this.mArray = [];
    for (let i = 0; i < 6; i++) {
      // 月のマテリアルとメッシュ
      this.moonMaterial = new THREE.MeshBasicMaterial({ color: 0xf7db70 });
      this.moonMaterial.map = this.moonTexture;
      this.moon = new THREE.Mesh(this.sphereGeometry, this.moonMaterial);
      // 月はやや小さくして、さらに位置も動かす
      this.moon.scale.setScalar(ThreeApp.MOON_SCALE);
      const xPosition = ThreeApp.MOON_DISTANCE * i;
      const zPosition = Math.random() * 6 - 3;
      const direction = i % 2 === 0 ? true : false;
      this.moon.position.set(xPosition, 0.0, zPosition);
      const m = { m: this.moon, distance: xPosition, direction: direction };
      this.mArray.push(m);
      this.scene.add(this.moon);
    }

    // グループ
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.group.add(this.moon);

    // 人工衛星のマテリアルとメッシュ
    this.satelliteMaterial = new THREE.MeshBasicMaterial(
      ThreeApp.MATERIAL_PARAM
    );
    this.satellite = new THREE.Mesh(
      this.sphereGeometry,
      this.satelliteMaterial
    );
    this.scene.add(this.satellite);
    this.satellite.scale.setScalar(0.1); // より小さく
    this.satellite.position.set(0.0, 0.0, ThreeApp.MOON_DISTANCE); // +Z の方向に初期位置を設定
    // 進行方向の初期値（念の為、汎用性を考えて単位化するよう記述）
    this.satelliteDirection = new THREE.Vector3(0.0, 0.0, 1.0).normalize();

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ヘルパー
    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);
    this.scene.add(this.axesHelper);

    const params = {
      threshold: 0,
      strength: 3,
      radius: 1,
      exposure: 1.5,
    };

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight)
    );
    bloomPass.threshold = params.threshold;
    bloomPass.strength = params.strength;
    bloomPass.radius = params.radius;

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(bloomPass);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

    // Clock オブジェクトの生成
    this.clock = new THREE.Clock();
  }

  /**
   * 描画処理
   */
  render() {
    // 恒常ループの設定
    requestAnimationFrame(this.render);

    // コントロールを更新
    this.controls.update();

    // 人工衛星は月を自動追尾する
    // (終点 - 始点) という計算を行うことで、２点間を結ぶベクトルを定義
    const subVector = new THREE.Vector3().subVectors(
      this.moon.position,
      this.satellite.position
    );
    // 長さに依存せず、向きだけを考えたい場合はベクトルを単位化する
    subVector.normalize();
    // 人工衛星の進行方向ベクトルに、向きベクトルを小さくスケールして加算する
    this.satelliteDirection.add(
      subVector.multiplyScalar(ThreeApp.SATELLITE_TURN_SCALE)
    );
    // 加算したことでベクトルの長さが変化するので、単位化してから人工衛星の座標に加算する
    this.satelliteDirection.normalize();
    const direction = this.satelliteDirection.clone();
    this.satellite.position.add(
      direction.multiplyScalar(ThreeApp.SATELLITE_SPEED)
    );

    // 前回のフレームからの経過時間の取得
    const time = this.clock.getElapsedTime();
    // 経過時間をそのままラジアンとしてサインとコサインを求める
    const sin = Math.sin(time);
    const cos = Math.cos(time);
    // 月の座標を（XZ 平面に水平に）動かす
    // フラグに応じてオブジェクトの状態を変化させる
    if (this.isDown === true) {
      this.mArray.forEach((item) => {
        item.m.position.x = item.direction
          ? cos * item.distance
          : -(cos * item.distance);
        item.m.position.z = sin * item.distance;
      });
    }
    // レンダラーで描画
    this.composer.render();
  }
}
