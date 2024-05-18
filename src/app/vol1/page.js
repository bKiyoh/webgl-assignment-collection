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

/*
 * Box クラス
 * ボックスメッシュの位置を更新するためのクラス
 */
class Box {
  // 変位範囲の定数
  static DISPLACEMENT_AMOUNT = {
    range: 0.5,
    scale: 0.02,
  };
  // 補完比率の定数
  static LERP_FACTOR = 0.03;

  /**
   * コンストラクタ
   * @constructor
   * @param {THREE.Mesh} mesh - メッシュ
   * @param {boolean} positionFlg - 位置フラグ
   */
  constructor(mesh, positionFlg) {
    this.mesh = mesh;
    this.positionFlg = positionFlg;
    this.displacement = {
      x:
        (Math.random() - Box.DISPLACEMENT_AMOUNT.range) *
        Box.DISPLACEMENT_AMOUNT.scale,
      y:
        (Math.random() - Box.DISPLACEMENT_AMOUNT.range) *
        Box.DISPLACEMENT_AMOUNT.scale,
      z:
        (Math.random() - Box.DISPLACEMENT_AMOUNT.range) *
        Box.DISPLACEMENT_AMOUNT.scale,
    };
    // 移動したオブジェクトを戻す用に初期位置を保持
    this.initialPosition = mesh.position.clone();
  }

  /**
   * 位置を更新
   */
  updatePosition() {
    // 変位を使って位置を更新
    this.mesh.position.x += this.displacement.x;
    this.mesh.position.y += this.displacement.y;
    this.mesh.position.z += this.displacement.z;
    /*
     * NOTE: 各軸の変位を自然な動作になる範囲に制限する
     * Math.random()が0から1の値を生成し、それに -0.5 を引いて -0.5 から +0.5 の範囲の値を作り出す。
     * さらに0.02倍することで、最終的に-0.01〜+0.01の範囲の値にしている。
     */
    this.displacement.x +=
      (Math.random() - Box.DISPLACEMENT_AMOUNT.range) *
      Box.DISPLACEMENT_AMOUNT.scale;
    this.displacement.y +=
      (Math.random() - Box.DISPLACEMENT_AMOUNT.range) *
      Box.DISPLACEMENT_AMOUNT.scale;
    this.displacement.z +=
      (Math.random() - Box.DISPLACEMENT_AMOUNT.range) *
      Box.DISPLACEMENT_AMOUNT.scale;
    /*
     * NOTE: 最大変異の制限
     * 変位量を-0.1〜0.1の範囲内に制限し、変位の肥大化を防ぐ
     */
    const maxDisplacement = 0.1;
    this.displacement.x = Math.max(
      -maxDisplacement,
      Math.min(maxDisplacement, this.displacement.x)
    );
    this.displacement.y = Math.max(
      -maxDisplacement,
      Math.min(maxDisplacement, this.displacement.y)
    );
    this.displacement.z = Math.max(
      -maxDisplacement,
      Math.min(maxDisplacement, this.displacement.z)
    );
  }

  /**
   * 位置をリセット
   */
  resetPosition() {
    /* NOTE: 初期位置に戻るように少しずつ移動
     * 現在の位置と初期位置の間の線形補間を行い、少しずつ初期位置に戻す
     * 線形保管とは => 中間地点の計算
     * https://qiita.com/niusounds/items/c4af702b06582590c82e
     */
    this.mesh.position.lerp(this.initialPosition, Box.LERP_FACTOR);
  }
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
    position: new THREE.Vector3(2.0, 2.0, 4.0),
    // カメラの注視点
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   * NOTE: width, heightは引数の値を使用する
   */
  static RENDERER_PARAM = {
    clearColor: 0x666666, // 画面をクリアする色
    rendererRatio: 120, // レンダラーの比率
  };
  /**
   * 平行光源定義のための定数
   */
  static DIRECTIONAL_LIGHT_PARAM = {
    color: 0xffffff, // 光の色
    intensity: 1.5, // 光の強度
    position: new THREE.Vector3(0, 2, 0), // 光の向き
    shadow: {
      near: 1,
      far: 10,
      right: 1,
      left: -1,
      top: 1,
      bottom: -1,
      mapSize: {
        width: 1024,
        height: 1024,
      },
    },
  };
  /**
   * アンビエントライト定義のための定数
   */
  static AMBIENT_LIGHT_PARAM = {
    color: 0xffffff, // 光の色
    intensity: 0.1, // 光の強度
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
  aspect; // アスペクト比
  directionalLight; // 平行光源（ディレクショナルライト）
  ambientLight; // アンビエントライト
  spotLight; // スポットライト
  geometry; // ジオメトリ
  material; // マテリアル
  box; // ボックスメッシュ
  boxArray; // トーラスメッシュの配列
  positionFlg; // 位置フラグ
  controls; // オービットコントロール
  isDown; // キーの押下状態用フラグ

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
    // todo: this.directionalLight に対して、ThreeApp.DIRECTIONAL_LIGHT_PARAM の値を設定してください
    this.directionalLight = new THREE.DirectionalLight(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity
    );
    this.directionalLight.position.copy(
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.position
    );
    this.directionalLight.castShadow = true;
    Object.assign(
      this.directionalLight.shadow.camera,
      ThreeApp.DIRECTIONAL_LIGHT_PARAM.shadow
    );
    this.scene.add(this.directionalLight);

    // アンビエントライト（環境光）
    this.ambientLight = new THREE.AmbientLight(
      ThreeApp.AMBIENT_LIGHT_PARAM.color,
      ThreeApp.AMBIENT_LIGHT_PARAM.intensity
    );
    this.scene.add(this.ambientLight);

    // スポットライト
    // todo: スポットライトを設定してください
    this.spotLight = new THREE.SpotLight(0xffffff, 60);
    this.spotLight.position.set(2, 3, 3);
    this.spotLight.angle = Math.PI / 5;
    this.spotLight.penumbra = 0.2;
    this.spotLight.castShadow = true;
    this.spotLight.shadow.mapSize.width = 1024;
    this.spotLight.shadow.mapSize.height = 1024;
    this.scene.add(this.spotLight);

    // マテリアル
    this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);

    // ジオメトリー
    const boxGeometry = 100;
    const transformScale = 5.0;
    this.geometry = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    this.boxArray = [];
    this.positionFlg = false;
    const range = [-2, -1, 0, 1, 2];
    range.forEach((z) => {
      range.forEach((y) => {
        range.forEach((x) => {
          const boxMesh = new THREE.Mesh(this.geometry, this.material);
          boxMesh.position.set(x / 5, y / 5, z / 5);
          boxMesh.castShadow = true;
          this.scene.add(boxMesh);
          this.positionFlg = !this.positionFlg;
          const box = new Box(boxMesh, this.positionFlg);
          this.boxArray.push(box);
        });
      });
    });

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // thisのバインド
    this.render = this.render.bind(this);

    // キーの押下状態を保持するフラグ
    this.isDown = false;

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
        this.renderer.setSize(width, height);
        // カメラが撮影する視錐台のアスペクト比を再設定
        this.camera.aspect = this.aspect;
        // カメラのパラメータが変更されたときは行列を更新する
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
    if (this.isDown) {
      this.boxArray.forEach((box) => {
        box.updatePosition();
      });
    } else {
      this.boxArray.forEach((box) => {
        box.resetPosition();
      });
    }
    // レンダラーで描画
    this.renderer.render(this.scene, this.camera);
  }
}
