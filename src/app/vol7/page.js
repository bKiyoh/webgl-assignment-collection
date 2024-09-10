"use client";
import { useEffect, useRef } from "react";
import { WebGLUtility } from "@/lib/webGl/webgl.js";
import { Vec2, Vec3, Mat4 } from "@/lib/webGl/math";
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
  program; // WebGLProgram （プログラムオブジェクト）
  attributeLocation; // attribute 変数のロケーション
  attributeStride; // attribute 変数のストライド
  uniformLocation; // uniform 変数のロケーション
  planeGeometry; // 板ポリゴンのジオメトリ情報
  planeVBO; // 板ポリゴンの頂点バッファ
  planeIBO; // 板ポリゴンのインデックスバッファ
  startTime; // レンダリング開始時のタイムスタンプ
  camera; // WebGLOrbitCamera のインスタンス
  isRendering; // レンダリングを行うかどうかのフラグ
  texture; // テクスチャのインスタンス
  texture1; // テクスチャのインスタンス
  textureVisibility; // テクスチャの可視性
  isBlending; // ブレンディングを行うかどうかのフラグ @@@
  globalAlpha; // グローバルなアルファ値 @@@

  constructor(wrapper, width, height) {
    this.wrapper = wrapper;
    this.width = width - App.RENDERER_PARAM.rendererRatio;
    this.height = height - App.RENDERER_PARAM.rendererRatio;
    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);
  }

  /**
   * ブレンディングを設定する @@@
   * @param {boolean} flag - 設定する値
   */
  setBlending(flag) {
    const gl = this.gl;
    if (flag === true) {
      gl.enable(gl.BLEND);
    } else {
      gl.disable(gl.BLEND);
    }
  }

  /**
   * テクスチャのフィルタを設定する @@@
   * ※現在バインドされているアクティブなテクスチャが更新される点に注意
   * @param {number} filter - 設定する値
   */
  setTextureFilter(filter) {
    const gl = this.gl;
    // 縮小フィルタは常に指定どおり
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    // 拡大フィルタはミップマップ系は使えない
    if (filter === gl.NEAREST) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
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

    // 深度テストは初期状態で有効
    this.gl.enable(this.gl.DEPTH_TEST);

    // 初期状態ではテクスチャが見えているようにする
    this.textureVisibility = true;

    // 初期状態ではブレンディングは無効化 @@@
    this.isBlending = false;

    // 初期状態ではアルファ値は完全な不透明となるよう設定する @@@
    this.globalAlpha = 1.0;
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
      blending: this.isBlending,
      alpha: this.globalAlpha,
    };
    // テクスチャの表示・非表示
    pane.addBinding(parameter, "texture").on("change", (v) => {
      this.textureVisibility = v.value;
    });
    // ブレンドを行うかどうか @@@
    pane.addBinding(parameter, "blending").on("change", (v) => {
      this.isBlending = v.value;
      this.setBlending(v.value);
    });
    // グローバルなアルファ値 @@@
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
    this.canvas.width = this.width;
    this.canvas.height = this.height;
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
        // まずシェーダのソースコードを読み込む
        const VSSource = await WebGLUtility.loadFile("/vol7/shader/main.vert");
        const FSSource = await WebGLUtility.loadFile("/vol7/shader/main.frag");
        // 無事に読み込めたらシェーダオブジェクトの実体を生成する
        const vertexShader = WebGLUtility.createShaderObject(
          gl,
          VSSource,
          gl.VERTEX_SHADER
        );
        const fragmentShader = WebGLUtility.createShaderObject(
          gl,
          FSSource,
          gl.FRAGMENT_SHADER
        );
        this.program = WebGLUtility.createProgramObject(
          gl,
          vertexShader,
          fragmentShader
        );
        // 画像を読み込み、テクスチャを初期化する
        const image = await WebGLUtility.loadImage("/vol7/sample.jpg");
        const image1 = await WebGLUtility.loadImage("/vol7/sample1.png");
        this.texture = WebGLUtility.createTexture(gl, image);
        this.texture1 = WebGLUtility.createTexture(gl, image1);
        // Promsie を解決
        resolve();
      }
    });
  }

  /**
   * 頂点属性（頂点ジオメトリ）のセットアップを行う
   */
  setupGeometry() {
    // プレーンジオメトリの情報を取得
    const size = 2.0;
    const color = [1.0, 1.0, 1.0, 1.0];
    this.planeGeometry = WebGLGeometry.plane(size, size, color);

    // VBO と IBO を生成する
    this.planeVBO = [
      WebGLUtility.createVBO(this.gl, this.planeGeometry.position),
      WebGLUtility.createVBO(this.gl, this.planeGeometry.normal),
      WebGLUtility.createVBO(this.gl, this.planeGeometry.color),
      WebGLUtility.createVBO(this.gl, this.planeGeometry.texCoord),
    ];
    this.planeIBO = WebGLUtility.createIBO(this.gl, this.planeGeometry.index);
  }

  /**
   * 頂点属性のロケーションに関するセットアップを行う
   */
  setupLocation() {
    const gl = this.gl;
    // attribute location の取得
    this.attributeLocation = [
      gl.getAttribLocation(this.program, "position"),
      gl.getAttribLocation(this.program, "normal"),
      gl.getAttribLocation(this.program, "color"),
      gl.getAttribLocation(this.program, "texCoord"),
    ];
    // attribute のストライド
    this.attributeStride = [3, 3, 4, 2];
    // uniform location の取得
    this.uniformLocation = {
      mvpMatrix: gl.getUniformLocation(this.program, "mvpMatrix"),
      normalMatrix: gl.getUniformLocation(this.program, "normalMatrix"),
      intensity: gl.getUniformLocation(this.program, "intensity"),
      progress: gl.getUniformLocation(this.program, "progress"),
      time: gl.getUniformLocation(this.program, "time"),
      windowSize: gl.getUniformLocation(this.program, "windowSize"),
      textureSize: gl.getUniformLocation(this.program, "textureSize"),
      resolution: gl.getUniformLocation(this.program, "resolution"),
      textureUnit: gl.getUniformLocation(this.program, "textureUnit"),
      textureUnit1: gl.getUniformLocation(this.program, "textureUnit1"),
      useTexture: gl.getUniformLocation(this.program, "useTexture"), // テクスチャを使うかどうかのフラグ @@@
      globalAlpha: gl.getUniformLocation(this.program, "globalAlpha"), // グローバルアルファ @@@
    };
  }

  /**
   * レンダリングのためのセットアップを行う
   */
  setupRendering() {
    const gl = this.gl;
    // ビューポートを設定する
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // クリアする色と深度を設定する
    gl.clearColor(0.3, 0.3, 0.3, 1.0);
    gl.clearDepth(1.0);
    // 色と深度をクリアする
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // ブレンドの設定 @@@
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
    // その他の設定例（加算合成＋アルファで透明）
    // gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
  }

  /**
   * 描画を開始する
   */
  start() {
    const gl = this.gl;
    // 途中でテクスチャを切り替えないためここでバインドしておく @@@
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texture1);
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

    // レンダリングのセットアップ
    this.setupRendering();

    // モデル座標変換行列（ここでは特になにもモデル座標変換は掛けていない）
    const m = Mat4.identity();

    // ビュー・プロジェクション座標変換行列
    const v = this.camera.update();
    const fovy = 45;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 10.0;
    const p = Mat4.perspective(fovy, aspect, near, far);
    // 行列を乗算して MVP 行列を生成する（掛ける順序に注意）
    const vp = Mat4.multiply(p, v);

    // VBO と IBO を設定し、描画する
    WebGLUtility.enableBuffer(
      gl,
      this.planeVBO,
      this.attributeLocation,
      this.attributeStride,
      this.planeIBO
    );

    // サイズを定義
    let windowSize = Vec2.create(window.innerWidth, window.innerHeight);
    let textureSize = Vec2.create(1024, 1024);

    // プログラムオブジェクトを選択し uniform 変数を更新する
    gl.useProgram(this.program);

    // 汎用的な uniform 変数は先にまとめて設定しておく
    const progressValue = (Math.sin(nowTime) + 1.0) / 2.0;
    gl.uniform1f(this.uniformLocation.intensity, 1.0); // ここで 50.0 などの値を設定します
    gl.uniform1f(this.uniformLocation.progress, progressValue); // ここで 0.0 〜 1.0 の値を設定します
    gl.uniform1f(this.uniformLocation.time, nowTime);
    gl.uniform2fv(this.uniformLocation.windowSize, windowSize); //表示したいサイズ
    gl.uniform2fv(this.uniformLocation.textureSize, textureSize); // 画像のサイズ
    gl.uniform4f(
      this.uniformLocation.resolution,
      this.width,
      this.height,
      1.0 / this.width,
      1.0 / this.height
    );
    gl.uniform1i(this.uniformLocation.textureUnit, 0);
    gl.uniform1i(this.uniformLocation.textureUnit1, 1);
    gl.uniform1i(this.uniformLocation.useTexture, this.textureVisibility);
    gl.uniform1f(this.uniformLocation.globalAlpha, this.globalAlpha); // グローバルアルファ @@@

    // １つ目のポリゴンを描画する @@@
    {
      // モデル座標変換行列（１つ目は奥）
      const m = Mat4.translate(Mat4.identity(), Vec3.create(0.0, 0.0, -0.5));
      const mvp = Mat4.multiply(vp, m);
      const normalMatrix = Mat4.transpose(Mat4.inverse(m));
      gl.uniformMatrix4fv(this.uniformLocation.mvpMatrix, false, mvp);
      gl.uniformMatrix4fv(
        this.uniformLocation.normalMatrix,
        false,
        normalMatrix
      );
      gl.drawElements(
        gl.TRIANGLES,
        this.planeGeometry.index.length,
        gl.UNSIGNED_SHORT,
        0
      );
    }

    // ２つ目のポリゴンを描画する @@@
    {
      // モデル座標変換行列（２つ目は手前）
      const m = Mat4.translate(Mat4.identity(), Vec3.create(0.0, 0.0, 0.5));
      const mvp = Mat4.multiply(vp, m);
      const normalMatrix = Mat4.transpose(Mat4.inverse(m));
      gl.uniformMatrix4fv(this.uniformLocation.mvpMatrix, false, mvp);
      gl.uniformMatrix4fv(
        this.uniformLocation.normalMatrix,
        false,
        normalMatrix
      );
      gl.drawElements(
        gl.TRIANGLES,
        this.planeGeometry.index.length,
        gl.UNSIGNED_SHORT,
        0
      );
    }
  }
}
