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
   * 球体のスケール
   */
  static SPHERE_SCALE = 0.27;
  /**
   * 地球から球体までの距離
   */
  static SPHERE_DISTANCE = 3.0;

  static SATELLITE_PROP = {
    /**
     * 人工衛星の移動速度
     */
    SPEED: 0.1,
    /**
     * 人工衛星の曲がる力
     */
    TURN_SCALE: 0.1,
    SIZE_SCALER: 0.3,
  };
  /**
   * カメラのパラメータ
   */
  static CAMERA_PARAM = {
    fovy: 60,
    near: 0.1,
    far: 50.0,
    position: new THREE.Vector3(8, 0, 0),
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
   * マテリアルのパラメータ
   */
  static MATERIAL_PARAM = {
    color: 0x80cbc4,
  };

  /**
   * 球体の数
   */
  static SPHERE_COUNT = 10;

  wrapper; // canvasの親要素
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
  sphere; // 球体
  sphereMaterial; // 球体マテリアル
  sphereTexture; // 球体テクスチャ
  satellite; // 人工衛星
  satelliteMaterial; // 人工衛星用マテリアル
  satelliteDirection; // 人工衛星の進行方向
  group; // グループ
  composer; // エフェクトコンポーザー
  renderPass; // レンダーパス
  glitchPass; // グリッチパス
  spheres_horizontal; // 球体の配列
  spheres_diagonal1; // 球体の配列 斜め
  spheres_diagonal2; // 球体の配列 斜め
  spheres_diagonal3; // 球体の配列 斜め
  spheres_diagonalM1; // 球体の配列 斜め
  spheres_diagonalM2; // 球体の配列 斜め
  spheres_diagonal_reverse1; // 球体の配列 斜めの逆
  spheres_diagonal_reverse2; // 球体の配列 斜めの逆
  spheres_diagonal_reverse3; // 球体の配列 斜めの逆
  spheres_diagonal_reverseM1; // 球体の配列 斜めの逆
  spheres_diagonal_reverseM2; // 球体の配列 斜めの逆
  sphereCount; // 球体の数
  satellites_diagonal1; // 球体の配列 斜め
  satellites_diagonal2; // 球体の配列 斜め
  satellites_diagonal3; // 球体の配列 斜め
  satellites_diagonalM1; // 球体の配列 斜め
  satellites_diagonalM2; // 球体の配列 斜め
  satellites_diagonal_reverse1; // 球体の配列 斜めの逆
  satellites_diagonal_reverse2; // 球体の配列 斜めの逆
  satellites_diagonal_reverse3; // 球体の配列 斜めの逆
  satellites_diagonal_reverseM1; // 球体の配列 斜めの逆
  satellites_diagonal_reverseM2; // 球体の配列 斜めの逆

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
      const spherePath = "/sphere.jpg";
      const loader = new THREE.TextureLoader();
      loader.load(spherePath, (sphereTexture) => {
        this.sphereTexture = sphereTexture; // 球体テクスチャをロード
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

    // 球体のジオメトリの設定
    this.sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);

    // 地球のマテリアルとメッシュの設定
    this.earthMaterial = new THREE.MeshBasicMaterial({ color: 0x95ccff });
    this.earthMaterial.map = this.sphereTexture;
    this.earth = new THREE.Mesh(this.sphereGeometry, this.earthMaterial);
    this.scene.add(this.earth);

    // NOTE: 等間隔でオブジェクトを配置するために円の全周（2πラジアン）をオブジェクトの数で割る
    const angleStep = (2 * Math.PI) / ThreeApp.SPHERE_COUNT; // 球体を配置する角度のステップ

    // グループ
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // 球体配列の初期化
    this.spheres_horizontal = [];
    this.spheres_diagonal1 = [];
    this.spheres_diagonal2 = [];
    this.spheres_diagonal3 = [];
    this.spheres_diagonalM1 = [];
    this.spheres_diagonalM2 = [];
    this.spheres_diagonal_reverse1 = [];
    this.spheres_diagonal_reverse2 = [];
    this.spheres_diagonal_reverse3 = [];
    this.spheres_diagonal_reverseM1 = [];
    this.spheres_diagonal_reverseM2 = [];
    this.satellites_diagonal1 = [];
    this.satellites_diagonal2 = [];
    this.satellites_diagonal3 = [];
    this.satellites_diagonalM1 = [];
    this.satellites_diagonalM2 = [];
    this.satellites_diagonal_reverse1 = [];
    this.satellites_diagonal_reverse2 = [];
    this.satellites_diagonal_reverse3 = [];
    this.satellites_diagonal_reverseM1 = [];
    this.satellites_diagonal_reverseM2 = [];

    // 球体の初期配置
    this.createSpheres(this.spheres_horizontal, true);
    this.createSpheres(this.spheres_diagonal1);
    this.createSpheres(this.spheres_diagonal2);
    this.createSpheres(this.spheres_diagonal3);
    this.createSpheres(this.spheres_diagonalM1);
    this.createSpheres(this.spheres_diagonalM2);
    this.createSpheres(this.spheres_diagonal_reverse1);
    this.createSpheres(this.spheres_diagonal_reverse2);
    this.createSpheres(this.spheres_diagonal_reverse3);
    this.createSpheres(this.spheres_diagonal_reverseM1);
    this.createSpheres(this.spheres_diagonal_reverseM2);

    // 人工衛星のマテリアルとメッシュ
    this.createSatellite(this.satellites_diagonal1);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement); // オービットコントロールの設定

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

  /**
   * 球体を作成して配置する関数
   */
  createSpheres(spheresArray, colorFlg) {
    for (let i = 0; i < ThreeApp.SPHERE_COUNT; i++) {
      const color = new THREE.Color();
      color.setHSL(
        Math.random() * (0.75 - 0.5) + 0.5, // 色相: 0.5から0.75の範囲でランダム
        0.6, // 彩度
        Math.random() * 0.8 + 0.05 // 明度: 0.05から0.85の範囲でランダム
      );
      if (colorFlg) {
        color.setHSL(0.9, 0.6, Math.random() * 0.95 + 0.05);
      }
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: color });
      sphereMaterial.map = this.sphereTexture; // 画像貼り付け
      const sphere = new THREE.Mesh(this.sphereGeometry, sphereMaterial);
      sphere.scale.setScalar(ThreeApp.SPHERE_SCALE); // オブジェクトの大きさ調整
      const sphereObj = {
        m: sphere,
        direction: true,
      };
      spheresArray.push(sphereObj); // 球体を配列に追加
      this.group.add(sphere); // 球体をシーンに追加
    }
  }
  /**
   * 衛星を作成して配置する関数
   */
  createSatellite(satelliteArray) {
    for (let i = 0; i < ThreeApp.SPHERE_COUNT; i++) {
      // 人工衛星のマテリアルとメッシュ
      this.satelliteMaterial = new THREE.MeshBasicMaterial({ color: 0xff00dd });
      this.satellite = new THREE.Mesh(
        this.sphereGeometry,
        this.satelliteMaterial
      );
      this.satellite.scale.setScalar(ThreeApp.SATELLITE_PROP.SIZE_SCALER); // より小さく
      this.satellite.position.set(0.0, 0.0, ThreeApp.MOON_DISTANCE); // +Z の方向に初期位置を設定
      this.satellite.map = this.sphereTexture;
      // 進行方向の初期値（念の為、汎用性を考えて単位化するよう記述
      this.satelliteDirection = new THREE.Vector3(
        0.0,
        0.0,
        ThreeApp.MOON_DISTANCE
      ).normalize();
      satelliteArray.push(this.satellite);
      console.log(satelliteArray);
      this.group.add(this.satellite);
    }
  }

  sphereAnimation() {
    const time = this.clock.getElapsedTime(); // 経過時間を取得
    this.spheres_horizontal.forEach((item, index) => {
      const distance = 2;
      // 各球体を円周上に等間隔に配置するための角度を計算
      // 'time' は球体が時間と共に回転するようにし、'index' を使って各球体が等間隔に配置されるようにする
      const angle = -(time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT)); // 各球体の位置を計算
      item.m.position.x = Math.cos(angle) * distance;
      item.m.position.z = Math.sin(angle) * distance;
    });
    this.spheres_diagonal1.forEach((item, index) => {
      const distance = 1;
      const angle = -(time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT));
      item.m.position.x = Math.cos(angle) * distance;
      item.m.position.y = Math.sin(angle) * distance + 2;
      item.m.position.z = Math.sin(angle) * distance - 2;
    });

    this.spheres_diagonal2.forEach((item, index) => {
      const distance = 2;
      const angle = -(time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT));
      item.m.position.x = Math.cos(angle) * distance;
      item.m.position.y = Math.sin(angle) * distance + 1;
      item.m.position.z = Math.sin(angle) * distance - 1;
    });

    this.spheres_diagonal3.forEach((item, index) => {
      const angle = -(time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT));
      item.m.position.x = Math.cos(angle) * ThreeApp.SPHERE_DISTANCE;
      item.m.position.y = Math.sin(angle) * ThreeApp.SPHERE_DISTANCE;
      item.m.position.z = Math.sin(angle) * ThreeApp.SPHERE_DISTANCE;
    });

    this.spheres_diagonalM1.forEach((item, index) => {
      const distance = 1;
      const angle = -(time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT));
      item.m.position.x = Math.cos(angle) * distance;
      item.m.position.y = Math.sin(angle) * distance - 2;
      item.m.position.z = Math.sin(angle) * distance + 2;
    });

    this.spheres_diagonalM2.forEach((item, index) => {
      const distance = 2;
      const angle = -(time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT));
      item.m.position.x = Math.cos(angle) * distance;
      item.m.position.y = Math.sin(angle) * distance - 1;
      item.m.position.z = Math.sin(angle) * distance + 1;
    });

    this.spheres_diagonal_reverse1.forEach((item, index) => {
      const distance = 1;
      const angle = time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT);
      item.m.position.x = -Math.cos(angle) * distance;
      item.m.position.y = Math.sin(angle) * distance + 2;
      item.m.position.z = -Math.sin(angle) * distance + 2;
    });

    this.spheres_diagonal_reverse2.forEach((item, index) => {
      const distance = 2;
      const angle = time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT);
      item.m.position.x = -Math.cos(angle) * distance;
      item.m.position.y = Math.sin(angle) * distance + 1;
      item.m.position.z = -Math.sin(angle) * distance + 1;
    });

    this.spheres_diagonal_reverse3.forEach((item, index) => {
      const angle = time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT);
      item.m.position.x = -Math.cos(angle) * ThreeApp.SPHERE_DISTANCE;
      item.m.position.y = Math.sin(angle) * ThreeApp.SPHERE_DISTANCE;
      item.m.position.z = -Math.sin(angle) * ThreeApp.SPHERE_DISTANCE;
    });

    this.spheres_diagonal_reverseM1.forEach((item, index) => {
      const distance = 1;
      const angle = time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT);
      item.m.position.x = -Math.cos(angle) * distance;
      item.m.position.y = Math.sin(angle) * distance - 2;
      item.m.position.z = -Math.sin(angle) * distance - 2;
    });

    this.spheres_diagonal_reverseM2.forEach((item, index) => {
      const distance = 2;
      const angle = time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT);
      item.m.position.x = -Math.cos(angle) * distance;
      item.m.position.y = Math.sin(angle) * distance - 1;
      item.m.position.z = -Math.sin(angle) * distance - 1;
    });
  }

  satelliteAnimation() {
    this.satellites_diagonal1.forEach((item, index) => {
      const subVector = new THREE.Vector3().subVectors(
        this.spheres_diagonal_reverseM2[0].m.position,
        item.position
      );
      subVector.normalize();
      this.satelliteDirection.add(
        subVector.multiplyScalar(ThreeApp.SATELLITE_PROP.TURN_SCALE)
      );
      item.position.add(
        subVector.multiplyScalar(ThreeApp.SATELLITE_PROP.SPEED)
      );
      this.satelliteDirection.normalize();
      const direction = this.satelliteDirection.clone();
      item.position.add(
        direction.multiplyScalar(ThreeApp.SATELLITE_PROP.SPEED)
      );
    });
  }

  // 描画処理
  render() {
    requestAnimationFrame(this.render); // 次のフレームでrenderを呼び出す

    this.controls.update(); // コントロールの更新

    this.sphereAnimation();

    this.satelliteAnimation();

    if (this.isDown) {
      this.group.rotation.y += 5;
    }

    this.composer.render();
  }
}
