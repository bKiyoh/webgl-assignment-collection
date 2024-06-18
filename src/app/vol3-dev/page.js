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
   * 月のスケール
   */
  static MOON_SCALE = 0.27;
  /**
   * 地球から月までの距離
   */
  static MOON_DISTANCE = 3.0;
  /**
   * 人工衛星の移動速度
   */
  static SATELLITE_SPEED = 0.05;
  /**
   * 人工衛星の方向転換のスケール
   */
  static SATELLITE_TURN_SCALE = 0.1;
  /**
   * カメラのパラメータ
   */
  static CAMERA_PARAM = {
    fovy: 60,
    near: 0.1,
    far: 50.0,
    position: new THREE.Vector3(2, 1, 8),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラのパラメータ
   */
  static RENDERER_PARAM = {
    clearColor: 0x000000,
    rendererRatio: 120,
  };
  /**
   * 平行光源のパラメータ
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 1.0,
    position: new THREE.Vector3(1.0, 1.0, 1.0),
  };
  /**
   * 環境光のパラメータ
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff,
    intensity: 0.3,
  };
  /**
   * マテリアルのパラメータ
   */
  static MATERIAL_PARAM = {
    color: 0x80cbc4,
  };
  /**
   * フォグのパラメータ
   */
  static FOG_PARAM = {
    color: 0xffffff,
    near: 10.0,
    far: 20.0,
  };

  /**
   * 月の数
   */
  static MOON_COUNT = 6;

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
  spheres_horizontal; // 月の配列
  spheres_diagonal; // 月の配列
  moonCount;

  constructor(wrapper, width, height) {
    this.wrapper = wrapper;
    this.width = width;
    this.height = height;

    this.render = this.render.bind(this);

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
      const moonPath = "/1.jpg";
      const loader = new THREE.TextureLoader();
      loader.load(moonPath, (moonTexture) => {
        this.moonTexture = moonTexture; // 月テクスチャをロード
        resolve();
      });
    });
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

    this.spheres_horizontal = [];
    this.initialMoonPositions = [];

    // NOTE: 等間隔でオブジェクトを配置するために円の全周（2πラジアン）をオブジェクトの数で割る
    const angleStep = (2 * Math.PI) / ThreeApp.MOON_COUNT; // 月を配置する角度のステップ

    // 月の配置
    for (let i = 0; i < ThreeApp.MOON_COUNT; i++) {
      // 色をランダムで生成
      const color = new THREE.Color();
      color.setHSL(Math.random(), 0.7, Math.random() * 1 + 0.05);
      this.moonMaterial = new THREE.MeshBasicMaterial({ color: color });
      this.moonMaterial.map = this.moonTexture; // 画像貼り付け
      this.moon = new THREE.Mesh(this.sphereGeometry, this.moonMaterial);
      this.moon.scale.setScalar(ThreeApp.MOON_SCALE); // オブジェクトの大きさ調整
      const angle = i * angleStep; // i番目の月の配置角度を計算

      // 地球から一定の距離 (MOON_DISTANCE) を保つように x座標を計算
      // cos(angle) を使って、月が地球の周りを回るように x方向の位置を決定
      const xPosition = Math.cos(angle) * ThreeApp.MOON_DISTANCE;

      // 地球から一定の距離 (MOON_DISTANCE) を保つように z座標を計算
      // sin(angle) を使って、月が地球の周りを回るように z方向の位置を決定
      const zPosition = Math.sin(angle) * ThreeApp.MOON_DISTANCE;

      // 計算された x, z座標を使って月の位置を設定
      // y座標は0に固定し、x, z座標をセット
      this.moon.position.set(xPosition, 0.0, zPosition);
      this.initialMoonPositions.push(this.moon.position.clone()); // 初期位置を保存
      const sphere = {
        m: this.moon,
        distance: ThreeApp.MOON_DISTANCE,
        direction: true,
      };
      this.spheres_horizontal.push(sphere); // 月を配列に追加
      this.scene.add(this.moon); // 月をシーンに追加
    }

    this.spheres_diagonal = [];
    for (let i = 0; i < ThreeApp.MOON_COUNT; i++) {
      const color = new THREE.Color();
      color.setHSL(Math.random(), 0.7, Math.random() * 1 + 0.05);
      this.moonMaterial = new THREE.MeshBasicMaterial({ color: color });
      this.moonMaterial.map = this.moonTexture; // 画像貼り付け
      this.moon = new THREE.Mesh(this.sphereGeometry, this.moonMaterial);
      this.moon.scale.setScalar(ThreeApp.MOON_SCALE); // オブジェクトの大きさ調整
      const angle = i * angleStep; // i番目の月の配置角度を計算
      const xPosition = Math.cos(angle) * ThreeApp.MOON_DISTANCE;
      const zPosition = Math.sin(angle) * ThreeApp.MOON_DISTANCE;
      this.moon.position.set(xPosition, xPosition, zPosition);
      this.initialMoonPositions.push(this.moon.position.clone()); // 初期位置を保存
      const m = {
        m: this.moon,
        distance: ThreeApp.MOON_DISTANCE,
        direction: true,
      };
      this.spheres_horizontal.push(m); // 月を配列に追加
      this.scene.add(this.moon); // 月をシーンに追加
    }

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
    this.spheres_horizontal.forEach((item, index) => {
      // 各月を円周上に等間隔に配置するための角度を計算
      // 'time' は月が時間と共に回転するようにし、'index' を使って各月が等間隔に配置されるようにする
      const angle = time + index * ((2 * Math.PI) / ThreeApp.MOON_COUNT); // 各月の位置を計算
      item.m.position.x = Math.cos(angle) * ThreeApp.MOON_DISTANCE;
      item.m.position.z = Math.sin(angle) * ThreeApp.MOON_DISTANCE;
    });

    this.spheres_diagonal.forEach((item, index) => {
      const angle = time + index * ((2 * Math.PI) / ThreeApp.MOON_COUNT); // 各月の位置を計算
      item.m.position.x = Math.cos(angle) * ThreeApp.MOON_DISTANCE;
      item.m.position.y = Math.sin(angle) * ThreeApp.MOON_DISTANCE; // y座標で動くように変更
      item.m.position.z = Math.sin(angle) * ThreeApp.MOON_DISTANCE;
    });

    this.composer.render(); // シーンをレンダリング
  }
}
