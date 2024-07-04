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
   * カメラ定義のための定数
   * NOTE: アスペクト比は引数の値を使用する
   * @param {number} fovy - 視野角
   * @param {number} near - カメラの前方クリップ面
   * @param {number} far - カメラの後方クリップ面
   * @param {THREE.Vector3} position - カメラの座標
   * @param {THREE.Vector3} lookAt - カメラの注視点
   */
  static CAMERA_PARAM = {
    fovy: 60,
    near: 0.1,
    far: 50.0,
    position: new THREE.Vector3(3.5, 3.5, 5.5),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   * NOTE: width, heightは引数の値を使用する
   * @param {number} clearColor - 画面をクリアする色
   * @param {number} rendererRatio - レンダラーの比率
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
   * 球体のスケール
   */
  static SPHERE_SCALE = 0.27;
  /**
   * 中心から球体までの距離
   */
  static SPHERE_DISTANCE = 3.0;
  /**
   * 球体の数
   */
  static SPHERE_COUNT = 10;
  /**
   * 人工衛星のパラメーター
   * @param {number} speed - 人工衛星の移動速度
   * @param {number} turnScale -  人工衛星の曲がる力
   * @param {number} sizeScaler -  人工衛星のサイズ
   */
  static SATELLITE_PROP = {
    speed: 0.1,
    turnScale: 0.05,
    sizeScaler: 0.1,
  };
  /**
   * ブルームエフェクトのパラメータ
   * @param {number} threshold
   * @param {number} strength
   * @param {number} radius
   * @param {number} exposure
   */
  static BLOOM_PROP = {
    threshold: 0,
    strength: 2,
    radius: 1,
  };

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
  spheres_horizontal; // 球体の配列
  spheres_diagonal1; // 球体の配列 斜め1
  spheres_diagonal2; // 球体の配列 斜め2
  spheres_diagonal3; // 球体の配列 斜め3
  spheres_diagonalM1; // 球体の配列 斜めM1
  spheres_diagonalM2; // 球体の配列 斜めM2
  spheres_diagonal_reverse1; // 球体の配列 斜めの逆1
  spheres_diagonal_reverse2; // 球体の配列 斜めの逆2
  spheres_diagonal_reverse3; // 球体の配列 斜めの逆3
  spheres_diagonal_reverseM1; // 球体の配列 斜めの逆M1
  spheres_diagonal_reverseM2; // 球体の配列 斜めの逆M2
  satellites_diagonal1; // 人工衛星の配列 斜め1
  satellites_diagonal2; // 人工衛星の配列 斜め2
  satellites_diagonal3; // 人工衛星の配列 斜め3
  satellites_diagonalM1; // 人工衛星の配列 斜めM1
  satellites_diagonalM2; // 人工衛星の配列 斜めM2
  satellites_diagonal_reverse1; // 人工衛星の配列 斜めの逆1
  satellites_diagonal_reverse2; // 人工衛星の配列 斜めの逆2
  satellites_diagonal_reverse3; // 人工衛星の配列 斜めの逆3
  satellites_diagonal_reverseM1; // 人工衛星の配列 斜めの逆M1
  satellites_diagonal_reverseM2; // 人工衛星の配列 斜めの逆M2
  group; // グループ

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

  /**
   * アセット（素材）のロードを行うPromise
   */
  load() {
    return new Promise((resolve) => {
      const spherePath = "/vol3/sphere.jpg";
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
    // NOTE：球体の方が動きは視認しやすいが、ボックスの方が好みだったので変更（なので名前が適切でない）
    // this.sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    this.sphereGeometry = new THREE.BoxGeometry(3, 0.1, 0.1);

    // 中心のマテリアルとメッシュの設定
    this.earthMaterial = new THREE.MeshBasicMaterial({ color: 0x95ccff });
    this.earthMaterial.map = this.sphereTexture;
    this.earth = new THREE.Mesh(this.sphereGeometry, this.earthMaterial);
    this.earth.rotation.set(Math.PI / 4, Math.PI / 4, 0);

    this.scene.add(this.earth);

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

    // 人口衛星の初期化
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
    // 人工衛星の初期配置
    this.createSatellites(this.satellites_diagonal1, this.spheres_diagonal1);
    this.createSatellites(this.satellites_diagonal2, this.spheres_diagonal2);
    this.createSatellites(this.satellites_diagonal3, this.spheres_diagonal3);
    this.createSatellites(this.satellites_diagonalM1, this.spheres_diagonalM1);
    this.createSatellites(this.satellites_diagonalM2, this.spheres_diagonalM2);
    this.createSatellites(
      this.satellites_diagonal_reverse1,
      this.spheres_diagonal_reverse1
    );
    this.createSatellites(
      this.satellites_diagonal_reverse2,
      this.spheres_diagonal_reverse2
    );
    this.createSatellites(
      this.satellites_diagonal_reverse3,
      this.spheres_diagonal_reverse3
    );
    this.createSatellites(
      this.satellites_diagonal_reverseM1,
      this.spheres_diagonal_reverseM1
    );
    this.createSatellites(
      this.satellites_diagonal_reverseM2,
      this.spheres_diagonal_reverseM2
    );

    // オービットコントロールの設定
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // ブルームエフェクトの設定
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight)
    );
    bloomPass.threshold = ThreeApp.BLOOM_PROP.threshold;
    bloomPass.strength = ThreeApp.BLOOM_PROP.strength;
    bloomPass.radius = ThreeApp.BLOOM_PROP.radius;

    // エフェクトコンポーザーの設定
    this.composer = new EffectComposer(this.renderer);
    // レンダーパスの設定
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(bloomPass);

    // キーの押下状態フラグを初期化
    this.isDown = false;

    // Clockオブジェクトの生成
    this.clock = new THREE.Clock();
  }

  /**
   * 球体を作成して配置する関数
   */
  createSpheres(spheres, colorFlg) {
    for (let i = 0; i < ThreeApp.SPHERE_COUNT; i++) {
      const color = new THREE.Color();
      color.setHSL(
        Math.random() * (0.75 - 0.5) + 0.5, // 色相: 0.5から0.75の範囲でランダム
        0.6, // 彩度
        Math.random() * 0.8 + 0.05 // 明度: 0.05から0.85の範囲でランダム
      );
      if (colorFlg) {
        color.setHSL(
          Math.random() * (0.4 - 0.25) + 0.25,
          0.6,
          Math.random() * 0.8 + 0.05
        );
      }
      const sphereMaterial = new THREE.MeshBasicMaterial({ color: color });
      sphereMaterial.map = this.sphereTexture; // 画像貼り付け
      const sphereMesh = new THREE.Mesh(this.sphereGeometry, sphereMaterial);
      sphereMesh.rotation.set(Math.PI / 4, Math.PI / 4, 0);
      sphereMesh.scale.setScalar(ThreeApp.SPHERE_SCALE); // オブジェクトの大きさ調整
      const sphereObj = {
        sphere: sphereMesh,
        direction: true,
      };
      spheres.push(sphereObj); // 球体を配列に追加
      this.group.add(sphereMesh); // 球体をシーンに追加
    }
  }

  /**
   * 衛星を作成して配置する関数
   */
  createSatellites(satellites, spheres) {
    for (let i = 0; i < spheres.length; i++) {
      const color = new THREE.Color();
      color.setHSL(
        Math.random() * (0.75 - 0.5) + 0.5,
        0.6,
        Math.random() * 0.8 + 0.05
      );
      const sphere = spheres[i].sphere;
      const satelliteMaterial = new THREE.MeshBasicMaterial({
        color: color,
      });
      const satelliteMesh = new THREE.Mesh(
        this.sphereGeometry,
        satelliteMaterial
      );
      satelliteMesh.scale.setScalar(ThreeApp.SATELLITE_PROP.sizeScaler);
      satelliteMesh.position.set(0.0, 0.0, ThreeApp.SPHERE_DISTANCE);
      satelliteMesh.rotation.set(Math.PI / 4, Math.PI / 4, 0);
      satelliteMesh.map = this.sphereTexture;
      // 進行方向の初期値（単位化）
      satelliteMesh.userData = {
        direction: new THREE.Vector3(
          0.0,
          0.0,
          ThreeApp.SPHERE_DISTANCE
        ).normalize(),
        targetSphere: sphere,
      };
      satellites.push(satelliteMesh);
      this.group.add(satelliteMesh);
    }
  }

  sphereAnimation() {
    const time = this.clock.getElapsedTime(); // 経過時間を取得
    this.spheres_horizontal.forEach((x, index) => {
      const distance = 2;
      // 各球体を円周上に等間隔に配置するための角度を計算
      // 'time' は球体が時間と共に回転するようにし、'index' を使って各球体が等間隔に配置されるようにする
      const angle = -(time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT)); // 各球体の位置を計算
      x.sphere.position.x = Math.cos(angle) * distance;
      x.sphere.position.z = Math.sin(angle) * distance;
    });
    this.spheres_diagonal1.forEach((x, index) => {
      const distance = 1;
      const angle = -(time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT));
      x.sphere.position.x = Math.cos(angle) * distance;
      x.sphere.position.y = Math.sin(angle) * distance + 2;
      x.sphere.position.z = Math.sin(angle) * distance - 2;
    });

    this.spheres_diagonal2.forEach((x, index) => {
      const distance = 2;
      const angle = -(time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT));
      x.sphere.position.x = Math.cos(angle) * distance;
      x.sphere.position.y = Math.sin(angle) * distance + 1;
      x.sphere.position.z = Math.sin(angle) * distance - 1;
    });

    this.spheres_diagonal3.forEach((x, index) => {
      const angle = -(time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT));
      x.sphere.position.x = Math.cos(angle) * ThreeApp.SPHERE_DISTANCE;
      x.sphere.position.y = Math.sin(angle) * ThreeApp.SPHERE_DISTANCE;
      x.sphere.position.z = Math.sin(angle) * ThreeApp.SPHERE_DISTANCE;
    });

    this.spheres_diagonalM1.forEach((x, index) => {
      const distance = 1;
      const angle = -(time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT));
      x.sphere.position.x = Math.cos(angle) * distance;
      x.sphere.position.y = Math.sin(angle) * distance - 2;
      x.sphere.position.z = Math.sin(angle) * distance + 2;
    });

    this.spheres_diagonalM2.forEach((x, index) => {
      const distance = 2;
      const angle = -(time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT));
      x.sphere.position.x = Math.cos(angle) * distance;
      x.sphere.position.y = Math.sin(angle) * distance - 1;
      x.sphere.position.z = Math.sin(angle) * distance + 1;
    });

    this.spheres_diagonal_reverse1.forEach((x, index) => {
      const distance = 1;
      const angle = time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT);
      x.sphere.position.x = -Math.cos(angle) * distance;
      x.sphere.position.y = Math.sin(angle) * distance + 2;
      x.sphere.position.z = -Math.sin(angle) * distance + 2;
    });

    this.spheres_diagonal_reverse2.forEach((x, index) => {
      const distance = 2;
      const angle = time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT);
      x.sphere.position.x = -Math.cos(angle) * distance;
      x.sphere.position.y = Math.sin(angle) * distance + 1;
      x.sphere.position.z = -Math.sin(angle) * distance + 1;
    });

    this.spheres_diagonal_reverse3.forEach((x, index) => {
      const angle = time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT);
      x.sphere.position.x = -Math.cos(angle) * ThreeApp.SPHERE_DISTANCE;
      x.sphere.position.y = Math.sin(angle) * ThreeApp.SPHERE_DISTANCE;
      x.sphere.position.z = -Math.sin(angle) * ThreeApp.SPHERE_DISTANCE;
    });

    this.spheres_diagonal_reverseM1.forEach((x, index) => {
      const distance = 1;
      const angle = time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT);
      x.sphere.position.x = -Math.cos(angle) * distance;
      x.sphere.position.y = Math.sin(angle) * distance - 2;
      x.sphere.position.z = -Math.sin(angle) * distance - 2;
    });

    this.spheres_diagonal_reverseM2.forEach((x, index) => {
      const distance = 2;
      const angle = time + index * ((2 * Math.PI) / ThreeApp.SPHERE_COUNT);
      x.sphere.position.x = -Math.cos(angle) * distance;
      x.sphere.position.y = Math.sin(angle) * distance - 1;
      x.sphere.position.z = -Math.sin(angle) * distance - 1;
    });
  }

  satelliteAnimation() {
    const animateSatellites = (satellites) => {
      satellites.forEach((satellite) => {
        // 衛星のターゲットスフィアを取得
        const targetSphere = satellite.userData.targetSphere;
        // 衛星の位置からターゲットスフィアの位置へのベクトルを計算
        const subVector = new THREE.Vector3().subVectors(
          targetSphere.position,
          satellite.position
        );
        // ベクトルを正規化
        subVector.normalize();
        // 衛星の現在の方向ベクトルに、ターンスケールを乗じた方向ベクトルを加算
        satellite.userData.direction.add(
          subVector.multiplyScalar(ThreeApp.SATELLITE_PROP.turnScale)
        );
        // 方向ベクトルを速度で乗じて、衛星の位置を更新
        satellite.position.add(
          satellite.userData.direction
            .clone()
            .multiplyScalar(ThreeApp.SATELLITE_PROP.speed)
        );
        // 方向ベクトルを正規化
        satellite.userData.direction.normalize();
      });
    };

    // 各衛星群に対してアニメーションを適用
    animateSatellites(this.satellites_diagonal1);
    animateSatellites(this.satellites_diagonal2);
    animateSatellites(this.satellites_diagonal3);
    animateSatellites(this.satellites_diagonalM1);
    animateSatellites(this.satellites_diagonalM2);
    animateSatellites(this.satellites_diagonal_reverse1);
    animateSatellites(this.satellites_diagonal_reverse2);
    animateSatellites(this.satellites_diagonal_reverse3);
    animateSatellites(this.satellites_diagonal_reverseM1);
    animateSatellites(this.satellites_diagonal_reverseM2);
  }

  // 描画処理
  render() {
    requestAnimationFrame(this.render);

    this.controls.update();

    this.sphereAnimation();
    this.satelliteAnimation();

    if (this.isDown) {
      this.group.rotation.y += 0.5;
    }

    this.composer.render();
  }
}
