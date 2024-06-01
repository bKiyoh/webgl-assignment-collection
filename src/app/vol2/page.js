"use client";
import { useEffect } from "react";
import * as THREE from "@/lib/threeJs/three.module.js";
import { OrbitControls } from "@/lib/threeJs/OrbitControls.js";
import {
  GodRaysFakeSunShader,
  GodRaysDepthMaskShader,
  GodRaysCombineShader,
  GodRaysGenerateShader,
} from "@/lib/threeJs/GodRaysShader.js";

export default function Page() {
  useEffect(() => {
    const { innerHeight: height, innerWidth: width } = window;
    const wrapper = document.querySelector("#webgl");
    const app = new ThreeApp(wrapper, width, height);
    app.render();
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
    far: 3000,
    position: new THREE.Vector3(180, -700, 500),
    lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
  };
  /**
   * レンダラー定義のための定数
   * NOTE: width, heightは引数の値を使用する
   * @param {number} clearColor - 画面をクリアする色
   * @param {number} rendererRatio - レンダラーの比率
   */
  static RENDERER_PARAM = {
    clearColor: 0xffffff, // 画面をクリアする色
    rendererRatio: 120, // レンダラーの比率
  };
  /**
   * マテリアル定義のための定数
   * @param {number} color - マテリアルの色
   */
  static MATERIAL_PARAM = {
    color: 0xfce4ec,
  };
  /**
   * ゴッドレイのパラメータ
   * @param {number} bgColor - 背景色
   * @param {number} sunColor - 太陽の色
   * @param {number} resolutionScale - ゴッドレイの解像度スケール
   */
  static GODRAY_PARAM = {
    bgColor: 0x000511, // 背景色
    sunColor: 0xffee00, // 太陽の色
    resolutionScale: 1.0 / 4.0, // ゴッドレイの解像度スケール
  };

  constructor(wrapper, width, height) {
    this.wrapper = wrapper; // ラッパー要素
    this.width = width; // 画面幅
    this.height = height; // 画面高さ
    this.camera = null; // カメラ
    this.scene = null; // シーン
    this.renderer = null; // レンダラー
    this.controls = null; // コントロール
    this.sunPosition = new THREE.Vector3(0, 1000, -1000); // 太陽の位置
    this.clipPosition = new THREE.Vector4(); // クリップ空間の位置
    this.screenSpacePosition = new THREE.Vector3(); // スクリーンスペースの位置
    this.postprocessing = { enabled: true }; // ポストプロセッシング
    this.rotationDirection = 1; // 初期の回転方向
    this.material = null; // マテリアル
    this.swingGroup = null; // 首振りグループ
    this.bladesGroup = null; // 羽グループ
    this.isDown = false; // キーの押下状態用フラグ

    this.init();
    this.animate();
  }

  /**
   * 初期化
   * @return {void}
   */
  init() {
    this.camera = new THREE.PerspectiveCamera(
      ThreeApp.CAMERA_PARAM.fovy,
      this.width / this.height,
      ThreeApp.CAMERA_PARAM.near,
      ThreeApp.CAMERA_PARAM.far
    );
    this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);
    this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);

    this.scene = new THREE.Scene();

    // グループ
    this.swingGroup = new THREE.Group();
    this.scene.add(this.swingGroup);
    this.bladesGroup = new THREE.Group();

    // マテリアル
    this.material = new THREE.MeshToonMaterial(ThreeApp.MATERIAL_PARAM);

    // ジオメトリー
    const shaftGeometry = new THREE.CylinderGeometry(8, 18, 500, 64);
    const armGeometry = new THREE.CapsuleGeometry(8, 40, 1, 64);

    // カスタムジオメトリで羽を作成
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0, 0); // 開始点
    bladeShape.bezierCurveTo(10, 0, 20, 5, 25, 30); // 滑らかな曲線を追加
    bladeShape.bezierCurveTo(30, 50, 35, 80, 20, 100);
    bladeShape.bezierCurveTo(5, 120, 0, 90, 0, 60);
    bladeShape.lineTo(0, 0); // 始点に戻る

    // エクストルード設定
    const extrudeSettings = {
      steps: 2,
      depth: 2,
      bevelEnabled: true,
      bevelThickness: 1,
      bevelSize: 1,
      bevelSegments: 1,
    };

    // エクストルードジオメトリ
    const bladeGeometry = new THREE.ExtrudeGeometry(
      bladeShape,
      extrudeSettings
    );

    // 羽を作成し、羽グループに追加
    const blades = 3;
    for (let i = 0; i < blades; i++) {
      const blade = new THREE.Mesh(bladeGeometry, this.material);
      blade.rotation.z = i * ((2 * Math.PI) / blades); // 120度ずつ回転
      this.bladesGroup.add(blade);
    }

    // 羽グループを所定の位置に配置
    this.bladesGroup.position.set(0, 75, 35);

    // メッシュ
    const shaftMesh = new THREE.Mesh(shaftGeometry, this.material);
    const armMesh = new THREE.Mesh(armGeometry, this.material);

    shaftMesh.position.y = -130; // シャフトメッシュの位置
    // アームメッシュの位置
    armMesh.position.y = 75;
    armMesh.position.z = 20;
    armMesh.rotateX(Math.PI / 2);

    this.scene.add(shaftMesh);
    this.swingGroup.add(armMesh);
    this.swingGroup.add(this.bladesGroup);

    // レンダラー
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(ThreeApp.RENDERER_PARAM.clearColor);
    this.renderer.setSize(
      this.width - ThreeApp.RENDERER_PARAM.rendererRatio,
      this.height - ThreeApp.RENDERER_PARAM.rendererRatio
    );
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.wrapper.appendChild(this.renderer.domElement);
    this.renderer.autoClear = false;

    // コントロール
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.minDistance = 50;
    this.controls.maxDistance = 500;

    window.addEventListener("resize", () => this.onWindowResize());

    this.initPostprocessing(this.width, this.height);
  }

  /**
   * ウィンドウリサイズ時の処理
   * @return {void}
   */
  onWindowResize() {
    const renderTargetWidth = window.innerWidth;
    const renderTargetHeight = window.innerHeight;

    this.camera.aspect = renderTargetWidth / renderTargetHeight;
    // updateProjectionMatrix()を呼び出すことで、カメラのプロパティ変更を反映
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(renderTargetWidth, renderTargetHeight);
    this.postprocessing.rtTextureColors.setSize(
      renderTargetWidth,
      renderTargetHeight
    );
    // レンダーターゲットのサイズを変更
    this.postprocessing.rtTextureDepth.setSize(
      renderTargetWidth,
      renderTargetHeight
    );
    this.postprocessing.rtTextureDepthMask.setSize(
      renderTargetWidth,
      renderTargetHeight
    );
    // ゴッドレイ用のレンダーターゲットのサイズを変更
    const adjustedWidth =
      renderTargetWidth * ThreeApp.GODRAY_PARAM.resolutionScale;
    const adjustedHeight =
      renderTargetHeight * ThreeApp.GODRAY_PARAM.resolutionScale;
    this.postprocessing.rtTextureGodRays1.setSize(
      adjustedWidth,
      adjustedHeight
    );
    this.postprocessing.rtTextureGodRays2.setSize(
      adjustedWidth,
      adjustedHeight
    );
  }

  /**
   * postprocessingの初期化
   * @param {*} renderTargetWidth
   * @param {*} renderTargetHeight
   * @return {void}
   */
  initPostprocessing(renderTargetWidth, renderTargetHeight) {
    // ポストプロセッシングシーンとカメラの設定
    this.postprocessing.scene = new THREE.Scene();
    this.postprocessing.camera = new THREE.OrthographicCamera(
      -0.5,
      0.5,
      0.5,
      -0.5,
      -10000,
      10000
    );
    this.postprocessing.camera.position.z = 100;
    this.postprocessing.scene.add(this.postprocessing.camera);

    // カラーバッファのレンダーターゲットを作成
    this.postprocessing.rtTextureColors = new THREE.WebGLRenderTarget(
      renderTargetWidth,
      renderTargetHeight,
      {
        type: THREE.HalfFloatType, // 浮動小数点数のテクスチャタイプ
      }
    );

    // 深度バッファのレンダーターゲットを作成
    this.postprocessing.rtTextureDepth = new THREE.WebGLRenderTarget(
      renderTargetWidth,
      renderTargetHeight,
      {
        type: THREE.HalfFloatType, // 浮動小数点数のテクスチャタイプ
      }
    );

    // 深度マスクバッファのレンダーターゲットを作成
    this.postprocessing.rtTextureDepthMask = new THREE.WebGLRenderTarget(
      renderTargetWidth,
      renderTargetHeight,
      {
        type: THREE.HalfFloatType, // 浮動小数点数のテクスチャタイプ
      }
    );

    // ゴッドレイエフェクト用の調整済みレンダーターゲットのサイズを計算
    const adjustedWidth =
      renderTargetWidth * ThreeApp.GODRAY_PARAM.resolutionScale;
    const adjustedHeight =
      renderTargetHeight * ThreeApp.GODRAY_PARAM.resolutionScale;

    // ゴッドレイエフェクト用のレンダーターゲットを作成
    this.postprocessing.rtTextureGodRays1 = new THREE.WebGLRenderTarget(
      adjustedWidth,
      adjustedHeight,
      {
        type: THREE.HalfFloatType, // 浮動小数点数のテクスチャタイプ
      }
    );
    this.postprocessing.rtTextureGodRays2 = new THREE.WebGLRenderTarget(
      adjustedWidth,
      adjustedHeight,
      {
        type: THREE.HalfFloatType, // 浮動小数点数のテクスチャタイプ
      }
    );

    // ゴッドレイ深度マスクシェーダーの設定
    const godraysMaskShader = GodRaysDepthMaskShader;
    this.postprocessing.godrayMaskUniforms = THREE.UniformsUtils.clone(
      godraysMaskShader.uniforms
    );
    this.postprocessing.materialGodraysDepthMask = new THREE.ShaderMaterial({
      uniforms: this.postprocessing.godrayMaskUniforms,
      vertexShader: godraysMaskShader.vertexShader,
      fragmentShader: godraysMaskShader.fragmentShader,
    });

    // ゴッドレイ生成シェーダーの設定
    const godraysGenShader = GodRaysGenerateShader;
    this.postprocessing.godrayGenUniforms = THREE.UniformsUtils.clone(
      godraysGenShader.uniforms
    );
    this.postprocessing.materialGodraysGenerate = new THREE.ShaderMaterial({
      uniforms: this.postprocessing.godrayGenUniforms,
      vertexShader: godraysGenShader.vertexShader,
      fragmentShader: godraysGenShader.fragmentShader,
    });

    // ゴッドレイ合成シェーダーの設定
    const godraysCombineShader = GodRaysCombineShader;
    this.postprocessing.godrayCombineUniforms = THREE.UniformsUtils.clone(
      godraysCombineShader.uniforms
    );
    this.postprocessing.materialGodraysCombine = new THREE.ShaderMaterial({
      uniforms: this.postprocessing.godrayCombineUniforms,
      vertexShader: godraysCombineShader.vertexShader,
      fragmentShader: godraysCombineShader.fragmentShader,
    });

    // ゴッドレイのフェイクサンシェーダーの設定
    const godraysFakeSunShader = GodRaysFakeSunShader;
    this.postprocessing.godraysFakeSunUniforms = THREE.UniformsUtils.clone(
      godraysFakeSunShader.uniforms
    );
    this.postprocessing.materialGodraysFakeSun = new THREE.ShaderMaterial({
      uniforms: this.postprocessing.godraysFakeSunUniforms,
      vertexShader: godraysFakeSunShader.vertexShader,
      fragmentShader: godraysFakeSunShader.fragmentShader,
    });

    // フェイクサンの背景色と太陽の色を設定
    this.postprocessing.godraysFakeSunUniforms.bgColor.value.setHex(
      ThreeApp.GODRAY_PARAM.bgColor
    );
    this.postprocessing.godraysFakeSunUniforms.sunColor.value.setHex(
      ThreeApp.GODRAY_PARAM.sunColor
    );

    // ゴッドレイの強度を設定
    this.postprocessing.godrayCombineUniforms.fGodRayIntensity.value = 0.75;

    // ゴッドレイ生成用の四角形メッシュを作成し、ポストプロセッシングシーンに追加
    this.postprocessing.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 1.0),
      this.postprocessing.materialGodraysGenerate
    );
    this.postprocessing.quad.position.z = -9900;
    this.postprocessing.scene.add(this.postprocessing.quad);
  }

  // アニメーション
  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();

    // 羽を回転
    this.bladesGroup.rotation.z += 0.035;
    // 首振り
    this.swingGroup.rotation.y += 0.002 * this.rotationDirection;
    // 首振りが一定範囲を超えたら方向を反転する
    if (this.swingGroup.rotation.y >= 1 || this.swingGroup.rotation.y <= -1) {
      this.rotationDirection *= -1;
    }
    this.render();
  }

  /**
   * ゴッドレイのステップサイズを取得
   * @param {number} filterLen - フィルターの長さ
   * @param {number} tapsPerPass - 各パスでのタップ数（サンプル数）
   * @param {number} pass - 現在のパスの番号
   * @return {number} ステップサイズ
   */
  getStepSize(filterLen, tapsPerPass, pass) {
    // ステップサイズを計算し、フィルターの長さを各パスのタップ数で割ったものに、現在のパス数の逆数を掛けた値を返す
    return filterLen * Math.pow(tapsPerPass, -pass);
  }

  /**
   * ゴッドレイのフィルタリング
   * @param {THREE.Texture} inputTex - 入力テクスチャ
   * @param {THREE.WebGLRenderTarget} renderTarget - レンダーターゲット
   * @param {number} stepSize - ステップサイズ
   * @return {void}
   */
  filterGodRays(inputTex, renderTarget, stepSize) {
    // シーン全体のマテリアルをゴッドレイ生成用のシェーダーマテリアルに一時的に置き換える
    this.postprocessing.scene.overrideMaterial =
      this.postprocessing.materialGodraysGenerate;
    // シェーダーのユニフォーム変数にステップサイズと入力テクスチャを設定
    this.postprocessing.godrayGenUniforms["fStepSize"].value = stepSize;
    this.postprocessing.godrayGenUniforms["tInput"].value = inputTex;
    // レンダーターゲットを設定し、シーンをレンダリングしてゴッドレイエフェクトを適用
    this.renderer.setRenderTarget(renderTarget);
    this.renderer.render(this.postprocessing.scene, this.postprocessing.camera);
    // シーンのオーバーライドマテリアルを解除
    this.postprocessing.scene.overrideMaterial = null;
  }

  /**
   * 描画処理
   * @return {void}
   */
  render() {
    if (this.postprocessing.enabled) {
      // 太陽の位置をクリップ空間に変換
      this.clipPosition.x = this.sunPosition.x;
      this.clipPosition.y = this.sunPosition.y;
      this.clipPosition.z = this.sunPosition.z;
      this.clipPosition.w = 1;

      // カメラの逆行列と投影行列を適用
      this.clipPosition
        .applyMatrix4(this.camera.matrixWorldInverse)
        .applyMatrix4(this.camera.projectionMatrix);

      // 正規化デバイス座標系に変換
      this.clipPosition.x /= this.clipPosition.w;
      this.clipPosition.y /= this.clipPosition.w;

      // スクリーンスペース座標に変換
      this.screenSpacePosition.x = (this.clipPosition.x + 1) / 2;
      this.screenSpacePosition.y = (this.clipPosition.y + 1) / 2;
      this.screenSpacePosition.z = this.clipPosition.z;

      // シェーダーのユニフォームにスクリーンスペースの太陽位置を設定
      this.postprocessing.godrayGenUniforms[
        "vSunPositionScreenSpace"
      ].value.copy(this.screenSpacePosition);
      this.postprocessing.godraysFakeSunUniforms[
        "vSunPositionScreenSpace"
      ].value.copy(this.screenSpacePosition);

      // カラーバッファにレンダリングを設定し、クリア
      this.renderer.setRenderTarget(this.postprocessing.rtTextureColors);
      this.renderer.clear(true, true, false);

      // 太陽のスクリーンスクエアサイズを設定
      const sunsqH = 0.74 * window.innerHeight;
      const sunsqW = 0.74 * window.innerHeight;

      // スクリーンスペースの太陽位置をピクセル単位に変換
      this.screenSpacePosition.x *= window.innerWidth;
      this.screenSpacePosition.y *= window.innerHeight;

      // シザーテストを設定してレンダリング領域を制限
      this.renderer.setScissor(
        this.screenSpacePosition.x - sunsqW / 2,
        this.screenSpacePosition.y - sunsqH / 2,
        sunsqW,
        sunsqH
      );
      this.renderer.setScissorTest(true);

      // フェイクサンシェーダーのアスペクト比を設定
      this.postprocessing.godraysFakeSunUniforms["fAspect"].value =
        window.innerWidth / window.innerHeight;

      // フェイクサンを描画
      this.postprocessing.scene.overrideMaterial =
        this.postprocessing.materialGodraysFakeSun;
      this.renderer.setRenderTarget(this.postprocessing.rtTextureColors);
      this.renderer.render(
        this.postprocessing.scene,
        this.postprocessing.camera
      );

      // シザーテストを解除
      this.renderer.setScissorTest(false);

      // シーンのオーバーライドマテリアルを解除し、シーンを再レンダリング
      this.scene.overrideMaterial = null;
      this.renderer.setRenderTarget(this.postprocessing.rtTextureColors);
      this.renderer.render(this.scene, this.camera);

      // 深度バッファにレンダリングを設定し、クリア
      this.renderer.setRenderTarget(this.postprocessing.rtTextureDepth);
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);

      // 深度マスクを生成
      this.postprocessing.godrayMaskUniforms["tInput"].value =
        this.postprocessing.rtTextureDepth.texture;
      this.postprocessing.scene.overrideMaterial =
        this.postprocessing.materialGodraysDepthMask;
      this.renderer.setRenderTarget(this.postprocessing.rtTextureDepthMask);
      this.renderer.render(
        this.postprocessing.scene,
        this.postprocessing.camera
      );

      // フィルターの長さとタップ数を定義
      const filterLen = 1.0;
      const TAPS_PER_PASS = 6.0;

      // ゴッドレイのステップごとにフィルタリングを適用
      this.filterGodRays(
        this.postprocessing.rtTextureDepthMask.texture,
        this.postprocessing.rtTextureGodRays2,
        this.getStepSize(filterLen, TAPS_PER_PASS, 1.0)
      );
      this.filterGodRays(
        this.postprocessing.rtTextureGodRays2.texture,
        this.postprocessing.rtTextureGodRays1,
        this.getStepSize(filterLen, TAPS_PER_PASS, 2.0)
      );
      this.filterGodRays(
        this.postprocessing.rtTextureGodRays1.texture,
        this.postprocessing.rtTextureGodRays2,
        this.getStepSize(filterLen, TAPS_PER_PASS, 3.0)
      );

      // 合成シェーダーのユニフォームにテクスチャを設定
      this.postprocessing.godrayCombineUniforms["tColors"].value =
        this.postprocessing.rtTextureColors.texture;
      this.postprocessing.godrayCombineUniforms["tGodRays"].value =
        this.postprocessing.rtTextureGodRays2.texture;

      // 合成シェーダーを使用して最終結果をレンダリング
      this.postprocessing.scene.overrideMaterial =
        this.postprocessing.materialGodraysCombine;
      this.renderer.setRenderTarget(null);
      this.renderer.render(
        this.postprocessing.scene,
        this.postprocessing.camera
      );
      this.postprocessing.scene.overrideMaterial = null;
    } else {
      // ポストプロセッシングが無効の場合、通常のシーンをレンダリング
      this.renderer.setRenderTarget(null);
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);
    }
  }
}
