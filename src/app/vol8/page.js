"use client";
import { useEffect, useRef } from "react";
import { WebGLUtility } from "@/lib/webGl/webgl.js";
import { Vec3, Mat4 } from "@/lib/webGl/math";
import { WebGLGeometry } from "@/lib/webGl/geometry.js";
import { WebGLOrbitCamera } from "@/lib/webGl/camera.js";
import { Pane } from "@/lib/webGl/tweakpane-4.0.3.min.js";

export default function Page() {
  const initializedRef = useRef(false);
  const initAndLoad = async (app) => {
    app.init();
    app.setupPane();
    await app.load();
    app.setupGeometry();
    app.setupLocation();
    // すべてのセットアップが完了したら描画を開始する
    app.start();
  };
  useEffect(() => {
    const { innerHeight: height, innerWidth: width } = window;
    const wrapper = document.querySelector("#webgl-canvas");
    if (wrapper && !initializedRef.current) {
      const app = new App(wrapper, width, height);
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
  return <canvas id="webgl-canvas" />;
}

/**
 * アプリケーション管理クラス
 */
class App {
  static RENDERER_PARAM = {
    rendererRatio: 120,
  };

  width;
  height;
  canvas; // WebGL で描画を行う canvas 要素
  gl; // WebGLRenderingContext （WebGL コンテキスト）
  renderProgram; // 最終シーン用プログラムオブジェクト
  renderAttLocation; // 最終シーン用の attribute 変数のロケーション
  renderAttStride; // 最終シーン用の attribute 変数のストライド
  renderUniLocation; // 最終シーン用の uniform 変数のロケーション
  offscreenProgram; // オフスクリーン用のプログラムオブジェクト
  offscreenAttLocation; // オフスクリーン用の attribute 変数のロケーション
  offscreenAttStride; // オフスクリーン用の attribute 変数のストライド
  offscreenUniLocation; // オフスクリーン用の uniform 変数のロケーション
  planeGeometry; // 板ポリゴンのジオメトリ情報
  planeVBO; // 板ポリゴンの頂点バッファ
  planeIBO; // 板ポリゴンのインデックスバッファ
  sphereGeometry; // 球体のジオメトリ情報
  sphereVBO; // 球体の頂点バッファ
  sphereIBO; // 球体のインデックスバッファ
  startTime; // レンダリング開始時のタイムスタンプ
  camera; // WebGLOrbitCamera のインスタンス
  isRendering; // レンダリングを行うかどうかのフラグ
  framebufferObject; // フレームバッファに関連するオブジェクト
  texture; // テクスチャ
  textureVisibility; // テクスチャの表示・非表示フラグ
  globalAlpha; // グローバルアルファ値
  mousePosition; // マウス座標を保持する変数
  isTypeOne; // ノイズ生成のロジック１を使うかどうかのフラグ @@@
  timeSpeed; // 時間の経過速度係数 @@@
  alpha; // ノイズに適用するアルファ値 @@@

  constructor(wrapper, width, height) {
    this.wrapper = wrapper;
    this.width = width - App.RENDERER_PARAM.rendererRatio;
    this.height = height - App.RENDERER_PARAM.rendererRatio;
    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);
    // マウスイベントのハンドラをバインド
    this.onMouseMove = this.onMouseMove.bind(this);
  }

  /**
   * 初期化処理を行う
   */
  init() {
    this.canvas = this.wrapper;
    this.gl = WebGLUtility.createWebGLContext(this.canvas);
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // カメラ制御用インスタンスを生成する
    const cameraOption = {
      distance: 5.0, // Z 軸上の初期位置までの距離
      min: 1.0, // カメラが寄れる最小距離
      max: 10.0, // カメラが離れられる最大距離
      move: 2.0, // 右ボタンで平行移動する際の速度係数
    };
    this.camera = new WebGLOrbitCamera(this.canvas, cameraOption);

    // 最初に一度リサイズ処理を行っておく
    this.resize();

    // リサイズイベントの設定
    window.addEventListener("resize", this.resize, false);

    // マウスイベントの設定
    this.canvas.addEventListener("mousemove", this.onMouseMove, false);

    // バックフェイスカリングと深度テストは初期状態で有効
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.enable(this.gl.DEPTH_TEST);

    // 初期状態ではテクスチャが見えているようにする
    this.textureVisibility = true;

    // 初期状態ではアルファ値は完全な不透明となるよう設定する
    this.globalAlpha = 1.0;

    // マウス位置の初期化（キャンバス中央）
    this.mousePosition = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
    };

    // 初期状態ではノイズの生成はロジック１を使う @@@
    this.isTypeOne = true;

    // 初期状態では時間の経過は 1.0 倍（早くも遅くもしない） @@@
    this.timeSpeed = 1.0;

    // 初期状態ではノイズのアルファは 0.5 で半透明 @@@
    this.alpha = 0.5;
  }

  /**
   * マウス移動時のイベントハンドラ
   */
  onMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePosition.x = event.clientX - rect.left;
    this.mousePosition.y = this.canvas.height - (event.clientY - rect.top); // Y座標を反転
  }

  /**
   * tweakpane の初期化処理
   */
  setupPane() {
    const gl = this.gl;
    // Tweakpane を使った GUI の設定
    const pane = new Pane();
    const parameter = {
      texture: this.textureVisibility,
      alpha: this.globalAlpha,
    };
    // テクスチャの表示・非表示
    pane.addBinding(parameter, "texture").on("change", (v) => {
      this.textureVisibility = v.value;
    });
    // グローバルなアルファ値
    pane
      .addBinding(parameter, "alpha", {
        min: 0.0,
        max: 1.0,
      })
      .on("change", (v) => {
        this.globalAlpha = v.value;
      });

    // TweakpaneのDOM要素の取得
    const paneElement = pane.element;
    // スタイルの適用で位置を調整
    paneElement.style.position = "absolute"; // 絶対位置に変更
    paneElement.style.top = "55px"; // 上からの位置
    paneElement.style.right = "55px"; // 右からの位置
    // ラベルの幅を調整して二段にならないようにする
    const labels = paneElement.querySelectorAll(".tp-lblv_l"); // Tweakpaneのラベル要素を取得
    for (const label of labels) {
      label.style.width = "auto"; // 幅を自動調整
      label.style.whiteSpace = "nowrap"; // テキストの折り返しを防止
    }
  }

  /**
   * リサイズ処理
   */
  resize() {
    const gl = this.gl;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // フレームバッファもリサイズ処理の対象とする
    if (this.framebufferObject == null) {
      // まだ生成されていない場合は、生成する
      this.framebufferObject = WebGLUtility.createFramebuffer(
        gl,
        this.canvas.width,
        this.canvas.height
      );
    } else {
      // 生成済みのフレームバッファもキャンバスにサイズを合わせる
      WebGLUtility.resizeFramebuffer(
        this.gl,
        this.canvas.width,
        this.canvas.height,
        this.framebufferObject.depthRenderbuffer,
        this.framebufferObject.texture
      );
    }
  }

  /**
   * 各種リソースのロードを行う
   * @return {Promise}
   */
  load() {
    return new Promise(async (resolve, reject) => {
      // 変数に WebGL コンテキストを代入しておく（コード記述の最適化）
      const gl = this.gl;
      // WebGL コンテキストがあるかどうか確認する
      if (gl == null) {
        // もし WebGL コンテキストがない場合はエラーとして Promise を reject する
        const error = new Error("not initialized");
        reject(error);
      } else {
        // 最終シーン用のシェーダ @@@
        const renderVSSource = await WebGLUtility.loadFile(
          "/vol8/shader/render.vert"
        );
        const renderFSSource = await WebGLUtility.loadFile(
          "/vol8/shader/render.frag"
        );
        const renderVertexShader = WebGLUtility.createShaderObject(
          gl,
          renderVSSource,
          gl.VERTEX_SHADER
        );
        const renderFragmentShader = WebGLUtility.createShaderObject(
          gl,
          renderFSSource,
          gl.FRAGMENT_SHADER
        );
        this.renderProgram = WebGLUtility.createProgramObject(
          gl,
          renderVertexShader,
          renderFragmentShader
        );

        // オフスクリーン用のシェーダ @@@
        const offscreenVSSource = await WebGLUtility.loadFile(
          "/vol8/shader/offscreen.vert"
        );
        const offscreenFSSource = await WebGLUtility.loadFile(
          "/vol8/shader/offscreen.frag"
        );
        const offscreenVertexShader = WebGLUtility.createShaderObject(
          gl,
          offscreenVSSource,
          gl.VERTEX_SHADER
        );
        const offscreenFragmentShader = WebGLUtility.createShaderObject(
          gl,
          offscreenFSSource,
          gl.FRAGMENT_SHADER
        );
        this.offscreenProgram = WebGLUtility.createProgramObject(
          gl,
          offscreenVertexShader,
          offscreenFragmentShader
        );

        // 画像を読み込み、テクスチャを初期化する
        const image = await WebGLUtility.loadImage("/vol8/sample.jpg");
        this.texture = WebGLUtility.createTexture(gl, image);

        resolve();
      }
    });
  }

  /**
   * 頂点属性（頂点ジオメトリ）のセットアップを行う
   */
  setupGeometry() {
    const color = [1.0, 1.0, 1.0, 1.0];
    const size = 2.0;
    // plane は this.renderProgram と一緒に使う
    const planeSize = 2.0;
    this.planeGeometry = WebGLGeometry.plane(planeSize, planeSize, color);
    this.planeVBO = [
      WebGLUtility.createVBO(this.gl, this.planeGeometry.position),
      WebGLUtility.createVBO(this.gl, this.planeGeometry.texCoord),
    ];
    this.planeIBO = WebGLUtility.createIBO(this.gl, this.planeGeometry.index);

    // プレーンジオメトリの情報を取得
    this.sphereGeometry = WebGLGeometry.plane(size, size, color);
    // VBO と IBO を生成する
    this.sphereVBO = [
      WebGLUtility.createVBO(this.gl, this.planeGeometry.position),
      WebGLUtility.createVBO(this.gl, this.planeGeometry.normal),
      WebGLUtility.createVBO(this.gl, this.planeGeometry.color),
      WebGLUtility.createVBO(this.gl, this.planeGeometry.texCoord),
    ];
    this.sphereIBO = WebGLUtility.createIBO(this.gl, this.planeGeometry.index);
  }

  /**
   * 頂点属性のロケーションに関するセットアップを行う
   */
  setupLocation() {
    const gl = this.gl;
    // レンダリング用のセットアップ
    this.renderAttLocation = [
      gl.getAttribLocation(this.renderProgram, "position"),
      gl.getAttribLocation(this.renderProgram, "texCoord"),
    ];
    this.renderAttStride = [3, 2];
    this.renderUniLocation = {
      textureUnit: gl.getUniformLocation(this.renderProgram, "textureUnit"), // テクスチャユニット
      useTypeOne: gl.getUniformLocation(this.renderProgram, "useTypeOne"), // ノイズの種類 @@@
      time: gl.getUniformLocation(this.renderProgram, "time"), // 時間の経過 @@@
      alpha: gl.getUniformLocation(this.renderProgram, "alpha"), // ノイズのアルファ @@@
    };

    // attribute location の取得
    this.offscreenAttLocation = [
      gl.getAttribLocation(this.offscreenProgram, "position"),
      gl.getAttribLocation(this.offscreenProgram, "normal"),
      gl.getAttribLocation(this.offscreenProgram, "color"),
      gl.getAttribLocation(this.offscreenProgram, "texCoord"),
    ];
    // attribute のストライド
    this.offscreenAttStride = [3, 3, 4, 2];
    // uniform location の取得
    this.offscreenUniLocation = {
      mvpMatrix: gl.getUniformLocation(this.offscreenProgram, "mvpMatrix"),
      normalMatrix: gl.getUniformLocation(
        this.offscreenProgram,
        "normalMatrix"
      ),
      textureUnit: gl.getUniformLocation(this.offscreenProgram, "textureUnit"),
      useTexture: gl.getUniformLocation(this.offscreenProgram, "useTexture"),
      globalAlpha: gl.getUniformLocation(this.offscreenProgram, "globalAlpha"),
      mousePosition: gl.getUniformLocation(
        this.offscreenProgram,
        "mousePosition"
      ), // マウス座標
      resolution: gl.getUniformLocation(this.offscreenProgram, "resolution"), // 画面サイズ
    };
  }

  /**
   * レンダリングのためのセットアップを行う
   */
  setupRendering() {
    const gl = this.gl;
    // フレームバッファのバインドを解除する
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // ビューポートを設定する
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // クリアする色と深度を設定する
    gl.clearColor(0.3, 0.3, 0.3, 1.0);
    gl.clearDepth(1.0);
    // 色と深度をクリアする
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // プログラムオブジェクトを選択
    gl.useProgram(this.renderProgram);
    // フレームバッファにアタッチされているテクスチャをバインドする
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.framebufferObject.texture);
  }

  /**
   * オフスクリーンレンダリングのためのセットアップを行う
   */
  setupOffscreenRendering() {
    const gl = this.gl;
    // フレームバッファをバインドして描画の対象とする
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebufferObject.framebuffer);
    // ビューポートを設定する
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // クリアする色と深度を設定する
    gl.clearColor(1.0, 0.6, 0.9, 1.0);
    gl.clearDepth(1.0);
    // 色と深度をクリアする
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // プログラムオブジェクトを選択
    gl.useProgram(this.offscreenProgram);
    // 第1パスで生成したテクスチャをバインド
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
  }

  /**
   * 描画を開始する
   */
  start() {
    const gl = this.gl;
    // テクスチャをバインド
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    // レンダリング開始時のタイムスタンプを取得しておく
    this.startTime = Date.now();
    // レンダリングを行っているフラグを立てておく
    this.isRendering = true;
    // レンダリングの開始
    this.render();
  }

  /**
   * 描画を停止する
   */
  stop() {
    this.isRendering = false;
  }

  /**
   * レンダリングを行う
   */
  render() {
    const gl = this.gl;
    // レンダリングのフラグの状態を見て、requestAnimationFrame を呼ぶか決める
    if (this.isRendering === true) {
      requestAnimationFrame(this.render);
    }
    // 現在までの経過時間
    const nowTime = (Date.now() - this.startTime) * 0.001;

    // - オフスクリーンレンダリング -------------------------------------------
    {
      // レンダリングのセットアップ
      this.setupOffscreenRendering();
      // オフスクリーンシーン用のビュー行列を作る
      const v = this.camera.update();
      // オフスクリーンシーン用のプロジェクション行列を作る
      const fovy = 45;
      const aspect = window.innerWidth / window.innerHeight;
      const near = 0.1;
      const far = 10.0;
      const p = Mat4.perspective(fovy, aspect, near, far);
      // オフスクリーン用のビュー・プロジェクション行列
      const vp = Mat4.multiply(p, v);
      // モデル座標変換行列（ここでは特になにもモデル座標変換は掛けていない）
      const m = Mat4.identity();
      // オフスクリーン用の MVP 行列
      const mvp = Mat4.multiply(vp, m);
      // オフスクリーン用の法線変換行列
      const normalMatrix = Mat4.transpose(Mat4.inverse(m));
      // VBO と IBO
      WebGLUtility.enableBuffer(
        gl,
        this.sphereVBO,
        this.offscreenAttLocation,
        this.offscreenAttStride,
        this.sphereIBO
      );
      gl.uniformMatrix4fv(this.offscreenUniLocation.mvpMatrix, false, mvp);
      gl.uniformMatrix4fv(
        this.offscreenUniLocation.normalMatrix,
        false,
        normalMatrix
      );
      gl.uniform3fv(
        this.offscreenUniLocation.lightVector,
        Vec3.create(1.0, 1.0, 1.0)
      );
      gl.uniform1i(this.offscreenUniLocation.textureUnit, 0);
      gl.uniform1i(
        this.offscreenUniLocation.useTexture,
        this.textureVisibility
      );
      gl.uniform1f(this.offscreenUniLocation.globalAlpha, this.globalAlpha);
      // マウス座標をシェーダーに渡す
      gl.uniform2f(
        this.offscreenUniLocation.mousePosition,
        this.mousePosition.x,
        this.mousePosition.y
      );
      // 画面サイズをシェーダーに渡す
      gl.uniform2f(
        this.offscreenUniLocation.resolution,
        this.canvas.width,
        this.canvas.height
      );
      // 描画
      gl.drawElements(
        gl.TRIANGLES,
        this.sphereGeometry.index.length,
        gl.UNSIGNED_SHORT,
        0
      );
    }
    // ------------------------------------------------------------------------

    // - 最終シーンのレンダリング ---------------------------------------------
    {
      // レンダリングのセットアップ
      this.setupRendering();

      // VBO と IBO
      WebGLUtility.enableBuffer(
        gl,
        this.planeVBO,
        this.renderAttLocation,
        this.renderAttStride,
        this.planeIBO
      );
      // シェーダに各種パラメータを送る
      gl.uniform1i(this.renderUniLocation.textureUnit, 0);
      gl.uniform1i(this.renderUniLocation.useTypeOne, this.isTypeOne); // ノイズ生成ロジック１を使うかどうか @@@
      gl.uniform1f(this.renderUniLocation.time, this.timeSpeed * nowTime); // 時間の経過 @@@
      gl.uniform1f(this.renderUniLocation.alpha, this.alpha); // ノイズのアルファ @@@
      // 描画
      gl.drawElements(
        gl.TRIANGLES,
        this.planeGeometry.index.length,
        gl.UNSIGNED_SHORT,
        0
      );
    }
    // ------------------------------------------------------------------------
  }
}
