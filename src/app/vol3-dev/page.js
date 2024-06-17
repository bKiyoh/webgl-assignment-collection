"use client";
import { useEffect, useRef } from "react";
import * as THREE from "@/lib/threeJs/three.module.js";
import { OrbitControls } from "@/lib/threeJs/OrbitControls.js";
import { EffectComposer } from "@/lib/threeJs/EffectComposer.js";
import { RenderPass } from "@/lib/threeJs/RenderPass.js";
import { UnrealBloomPass } from "@/lib/threeJs/UnrealBloomPass.js";

export default function Page() {
  const initializedRef = useRef(false);

  // ThreeAppの初期化とロードを行う関数
  const initAndLoad = async (app) => {
    await app.load(); // アセットのロードを待機
    app.init(); // Three.jsの初期化
    app.render(); // レンダリングの開始
  };

  // コンポーネントのマウント時とアンマウント時の処理
  useEffect(() => {
    const { innerHeight: height, innerWidth: width } = window; // ウィンドウの高さと幅を取得
    const wrapper = document.querySelector("#webgl"); // DOMからwebgl要素を取得
    if (wrapper && !initializedRef.current) {
      // まだ初期化されていない場合
      const app = new ThreeApp(wrapper, width, height); // ThreeAppのインスタンスを作成
      initAndLoad(app); // ThreeAppの初期化とロード
      initializedRef.current = true; // 初期化済みフラグを立てる
    }

    return () => {
      if (wrapper) {
        // アンマウント時にwebgl要素をクリア
        while (wrapper.firstChild) {
          wrapper.removeChild(wrapper.firstChild);
        }
      }
    };
  }, []);

  return <div id="webgl" />; // webgl要素をレンダリング
}

// Three.jsのアプリケーションクラスの定義
class ThreeApp {
  static MOON_SCALE = 0.27; // 月のスケール
  static MOON_DISTANCE = 3.0; // 地球から月までの距離
  static SATELLITE_SPEED = 0.05; // 人工衛星の移動速度
  static SATELLITE_TURN_SCALE = 0.1; // 人工衛星の方向転換のスケール
  static CAMERA_PARAM = {
    // カメラのパラメータ
    fovy: 60,
    near: 0.1,
    far: 50.0,
    position: new THREE.Vector3(2, 1, 8),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  static RENDERER_PARAM = {
    // レンダラのパラメータ
    clearColor: 0x000000,
    rendererRatio: 120,
  };
  static DIRECTIONAL_LIGHT_PARAM = {
    // 平行光源のパラメータ
    color: 0xffffff,
    intensity: 1.0,
    position: new THREE.Vector3(1.0, 1.0, 1.0),
  };
  static AMBIENT_LIGHT_PARAM = {
    // 環境光のパラメータ
    color: 0xffffff,
    intensity: 0.3,
  };
  static MATERIAL_PARAM = {
    // マテリアルのパラメータ
    color: 0x80cbc4,
  };
  static FOG_PARAM = {
    // フォグのパラメータ
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
  directionalLight; // 平行光源
  ambientLight; // 環境光
  controls; // オービットコントロール
  axesHelper; // 軸ヘルパー
  isDown; // キーの押下状態用フラグ
  clock; // 時間管理用
  sphereGeometry; // 球体のジオメトリ
  earth; // 地球
  earthMaterial; // 地球用マテリアル
  earthTexture; // 地球用テクスチャ
  moon; // 月
  moonMaterial; // 月用マテリアル
  moonTexture; // 月用テクスチャ
  initialMoonPositions; // 月の初期位置
  satellite; // 人工衛星
  satelliteMaterial; // 人工衛星用マテリアル
  satelliteDirection; // 人工衛星の進行方向
  group; // グループ
  composer; // エフェクトコンポーザー
  renderPass; // レンダーパス
  glitchPass; // グリッチパス
  mArray; // 月の配列

  // コンストラクタ
  constructor(wrapper, width, height) {
    this.wrapper = wrapper;
    this.width = width;
    this.height = height;

    this.render = this.render.bind(this); // renderメソッドのthisバインディング

    // キーイベントリスナーの設定
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
      () => {
        this.isDown = false;
      },
      false
    );

    // ウィンドウリサイズ時の処理
    window.addEventListener(
      "resize",
      () => {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = this.aspect;
        this.camera.updateProjectionMatrix();
      },
      false
    );
  }

  // アセット（素材）のロードを行うPromise
  load() {
    return new Promise((resolve) => {
      const earthPath = "/earth.jpg";
      const moonPath = "/1.jpg";
      const loader = new THREE.TextureLoader();
      loader.load(earthPath, (earthTexture) => {
        this.earthTexture = earthTexture; // 地球テクスチャをロード
        loader.load(moonPath, (moonTexture) => {
          this.moonTexture = moonTexture; // 月テクスチャをロード
          resolve();
        });
      });
    });
  }

  // 初期化処理
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
    this.scene.fog = new THREE.Fog(
      ThreeApp.FOG_PARAM.color,
      ThreeApp.FOG_PARAM.near,
      ThreeApp.FOG_PARAM.far
    );

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

    // 平行光源の設定
    this.directionalLight = new THREE.PointLight(0xffffff, 100);
    this.directionalLight.position.copy(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.position
    );
    this.scene.add(this.directionalLight);

    // 環境光の設定
    this.ambientLight = new THREE.HemisphereLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity
    );
    this.scene.add(this.ambientLight);

    // 球体のジオメトリの設定
    this.sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);

    // 地球のマテリアルとメッシュの設定
    this.earthMaterial = new THREE.MeshBasicMaterial({ color: 0x95ccff });
    this.earthMaterial.map = this.moonTexture;
    this.earth = new THREE.Mesh(this.sphereGeometry, this.earthMaterial);
    this.scene.add(this.earth);

    this.mArray = [];
    this.initialMoonPositions = [];

    const moonCount = 6; // 月の数
    const angleStep = (2 * Math.PI) / moonCount; // 月を配置する角度のステップ

    // 月の配置
    for (let i = 0; i < moonCount; i++) {
      const color = new THREE.Color();
      color.setHSL(Math.random(), 0.7, Math.random() * 1 + 0.05);

      this.moonMaterial = new THREE.MeshBasicMaterial({ color: color });
      this.moonMaterial.map = this.moonTexture;
      this.moon = new THREE.Mesh(this.sphereGeometry, this.moonMaterial);
      this.moon.scale.setScalar(ThreeApp.MOON_SCALE);

      const angle = i * angleStep; // 月の配置角度を計算
      const xPosition = Math.cos(angle) * ThreeApp.MOON_DISTANCE; // x座標を計算
      const zPosition = Math.sin(angle) * ThreeApp.MOON_DISTANCE; // z座標を計算

      this.moon.position.set(xPosition, 0.0, zPosition); // 月の位置を設定
      this.initialMoonPositions.push(this.moon.position.clone()); // 初期位置を保存
      const m = {
        m: this.moon,
        distance: ThreeApp.MOON_DISTANCE,
        direction: true,
      };
      this.mArray.push(m); // 月を配列に追加
      this.scene.add(this.moon); // 月をシーンに追加
    }

    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.group.add(this.moon);

    this.satelliteMaterial = new THREE.MeshBasicMaterial(
      ThreeApp.MATERIAL_PARAM
    );
    this.satellite = new THREE.Mesh(
      this.sphereGeometry,
      this.satelliteMaterial
    );
    this.satellite.scale.setScalar(0.1); // 人工衛星のスケールを設定
    this.satellite.position.set(0.0, 0.0, ThreeApp.MOON_DISTANCE); // 人工衛星の初期位置を設定
    this.satelliteDirection = new THREE.Vector3(0.0, 0.0, 1.0).normalize(); // 人工衛星の進行方向を設定

    this.controls = new OrbitControls(this.camera, this.renderer.domElement); // オービットコントロールの設定

    const axesBarLength = 5.0;
    this.axesHelper = new THREE.AxesHelper(axesBarLength);

    const params = {
      threshold: 0,
      strength: 2,
      radius: 1,
      exposure: 1.5,
    };

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight)
    );
    bloomPass.threshold = params.threshold;
    bloomPass.strength = params.strength;
    bloomPass.radius = params.radius;

    this.composer = new EffectComposer(this.renderer); // エフェクトコンポーザーの設定
    this.renderPass = new RenderPass(this.scene, this.camera); // レンダーパスの設定
    this.composer.addPass(this.renderPass);
    this.composer.addPass(bloomPass);

    this.isDown = false; // キーの押下状態フラグを初期化

    this.clock = new THREE.Clock(); // Clockオブジェクトの生成
  }

  // 描画処理
  render() {
    requestAnimationFrame(this.render); // 次のフレームでrenderを呼び出す

    this.controls.update(); // コントロールの更新

    const subVector = new THREE.Vector3().subVectors(
      this.moon.position,
      this.satellite.position
    );
    subVector.normalize();
    this.satelliteDirection.add(
      subVector.multiplyScalar(ThreeApp.SATELLITE_TURN_SCALE)
    );
    this.satelliteDirection.normalize();
    const direction = this.satelliteDirection.clone();
    this.satellite.position.add(
      direction.multiplyScalar(ThreeApp.SATELLITE_SPEED)
    );

    const time = this.clock.getElapsedTime(); // 経過時間を取得
    this.mArray.forEach((item, index) => {
      const angle = time + index * ((2 * Math.PI) / this.mArray.length); // 各月の位置を計算
      item.m.position.x = Math.cos(angle) * ThreeApp.MOON_DISTANCE;
      item.m.position.z = Math.sin(angle) * ThreeApp.MOON_DISTANCE;
    });

    this.composer.render(); // シーンをレンダリング
  }
}
