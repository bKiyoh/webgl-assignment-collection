"use client";
import { useEffect, useRef } from "react";
import { WebGLUtility } from "@/lib/webGl/webgl.js";
import { Vec3, Mat4 } from "@/lib/webGl/math.js";
import { WebGLGeometry } from "@/lib/webGl/geometry.js";
import { WebGLOrbitCamera } from "@/lib/webGl/camera.js";
import { Pane } from "@/lib/webGl/tweakpane-4.0.3.min.js"; // tweakpane の読み込み @@@

export function FragmentShaderShadingComponent() {
  const initializedRef = useRef(false);

  const initAndLoad = async (app) => {
    app.init();
    await app.load();
    app.setupGeometry();
    app.setupLocation();
    // すべてのセットアップが完了したら描画を開始する
    app.start();

    // Tweakpane を使った GUI の設定 @@@
    const pane = new Pane();
    const parameter = {
      culling: true,
      depthTest: true,
      rotation: false,
    };
    // バックフェイスカリングの有効・無効 @@@
    pane.addBinding(parameter, "culling").on("change", (v) => {
      app.setCulling(v.value);
    });
    // 深度テストの有効・無効 @@@
    pane.addBinding(parameter, "depthTest").on("change", (v) => {
      app.setDepthTest(v.value);
    });
    // 回転の有無 @@@
    pane.addBinding(parameter, "rotation").on("change", (v) => {
      app.setRotation(v.value);
    });
  };

  useEffect(() => {
    const { innerHeight: height, innerWidth: width } = window;
    const wrapper = document.querySelector("#webgl-canvas-2");
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

  return <canvas id="webgl-canvas-2" />;
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
  torusGeometry; // トーラスのジオメトリ情報 @@@
  torusVBO; // トーラスの頂点バッファ @@@
  torusIBO; // トーラスのインデックスバッファ @@@
  uniformLocation; // uniform 変数のロケーション
  startTime; // レンダリング開始時のタイムスタンプ
  isRendering; // レンダリングを行うかどうかのフラグ
  isRotation; // オブジェクトを Y 軸回転させるかどうか @@@
  camera; // WebGLOrbitCamera のインスタンス

  constructor(wrapper, width, height) {
    this.wrapper = wrapper;
    this.width = width;
    this.height = height;
    // this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);
  }

  /**
   * バックフェイスカリングを設定する @@@
   * @param {boolean} flag - 設定する値
   */
  setCulling(flag) {
    const gl = this.gl;
    if (gl == null) {
      return;
    }
    if (flag === true) {
      gl.enable(gl.CULL_FACE);
    } else {
      gl.disable(gl.CULL_FACE);
    }
  }

  /**
   * 深度テストを設定する @@@
   * @param {boolean} flag - 設定する値
   */
  setDepthTest(flag) {
    const gl = this.gl;
    if (gl == null) {
      return;
    }
    if (flag === true) {
      gl.enable(gl.DEPTH_TEST);
    } else {
      gl.disable(gl.DEPTH_TEST);
    }
  }

  /**
   * isRotation を設定する @@@
   * @param {boolean} flag - 設定する値
   */
  setRotation(flag) {
    this.isRotation = flag;
  }

  /**
   * 初期化処理を行う
   */
  init() {
    this.canvas = this.wrapper;
    this.gl = WebGLUtility.createWebGLContext(this.canvas);

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

    // バックフェイスカリングと深度テストは初期状態で有効
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.enable(this.gl.DEPTH_TEST);
  }

  /**
   * リサイズ処理
   */
  resize() {
    const size = Math.min(
      this.width - App.RENDERER_PARAM.rendererRatio,
      this.height - App.RENDERER_PARAM.rendererRatio
    );
    this.canvas.width = size;
    this.canvas.height = size;
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
        const VSSource = await WebGLUtility.loadFile(
          "/vol6/shader/FragmentShaderShading/main.vert"
        );
        const FSSource = await WebGLUtility.loadFile(
          "/vol6/shader/FragmentShaderShading/main.frag"
        );
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
        resolve();
      }
    });
  }

  /**
   * 頂点属性（頂点ジオメトリ）のセットアップを行う
   */
  setupGeometry() {
    // トーラスのジオメトリ情報を取得 @@@
    const row = 32;
    const column = 32;
    const innerRadius = 0.4;
    const outerRadius = 0.8;
    const color = [1.0, 1.0, 1.0, 1.0];
    this.torusGeometry = WebGLGeometry.torus(
      row,
      column,
      innerRadius,
      outerRadius,
      color
    );

    // VBO と IBO を生成する
    this.torusVBO = [
      WebGLUtility.createVBO(this.gl, this.torusGeometry.position),
      WebGLUtility.createVBO(this.gl, this.torusGeometry.normal), // 法線の VBO を生成する @@@
      WebGLUtility.createVBO(this.gl, this.torusGeometry.color),
    ];
    this.torusIBO = WebGLUtility.createIBO(this.gl, this.torusGeometry.index);
  }

  /**
   * 頂点属性のロケーションに関するセットアップを行う
   */
  setupLocation() {
    const gl = this.gl;
    // attribute location の取得
    this.attributeLocation = [
      gl.getAttribLocation(this.program, "position"),
      gl.getAttribLocation(this.program, "normal"), // 法線の attribute location を取得しておく @@@
      gl.getAttribLocation(this.program, "color"),
    ];
    // attribute のストライド
    this.attributeStride = [
      3,
      3, // 法線のストライドは XYZ の３要素 @@@
      4,
    ];
    // uniform location の取得
    this.uniformLocation = {
      mvpMatrix: gl.getUniformLocation(this.program, "mvpMatrix"),
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
  }

  /**
   * 描画を開始する
   */
  start() {
    this.startTime = Date.now();
    this.isRendering = true;
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

    // モデル座標変換行列（フラグが立っている場合だけ回転させる） @@@
    const rotateAxis = Vec3.create(0.0, 1.0, 0.0);
    const m =
      this.isRotation === true
        ? Mat4.rotate(Mat4.identity(), nowTime, rotateAxis)
        : Mat4.identity();

    // ビュー・プロジェクション座標変換行列
    const v = this.camera.update();
    const fovy = 45;
    const aspect = this.canvas.width / this.canvas.height;
    const near = 0.1;
    const far = 10.0;
    const p = Mat4.perspective(fovy, aspect, near, far);

    // 行列を乗算して MVP 行列を生成する（掛ける順序に注意）
    const vp = Mat4.multiply(p, v);
    const mvp = Mat4.multiply(vp, m);

    // プログラムオブジェクトを選択し uniform 変数を更新する
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.uniformLocation.mvpMatrix, false, mvp);

    // VBO と IBO を設定し、描画する
    WebGLUtility.enableBuffer(
      gl,
      this.torusVBO,
      this.attributeLocation,
      this.attributeStride,
      this.torusIBO
    );
    gl.drawElements(
      gl.TRIANGLES,
      this.torusGeometry.index.length,
      gl.UNSIGNED_SHORT,
      0
    );
  }
}
