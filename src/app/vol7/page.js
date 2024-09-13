"use client";
import { useEffect, useRef } from "react";
import { WebGLUtility } from "@/lib/webGl/webgl.js";
import { Vec3, Mat4 } from "@/lib/webGl/math";
import { WebGLGeometry } from "@/lib/webGl/geometry.js";

export default function Page() {
  const initializedRef = useRef(false);
  const initAndLoad = async (app) => {
    app.init();
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
  isRendering; // レンダリングを行うかどうかのフラグ
  texture; // テクスチャのインスタンス
  texture1; // テクスチャのインスタンス
  texture2; // テクスチャのインスタンス
  cameraPosition;
  cameraTarget;
  upDirection;

  constructor(wrapper, width, height) {
    this.wrapper = wrapper;
    this.width = width - App.RENDERER_PARAM.rendererRatio;
    this.height = height - App.RENDERER_PARAM.rendererRatio;
    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);
  }

  /**
   * テクスチャのフィルタを設定する
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

    // カメラを固定にするための設定
    this.cameraPosition = Vec3.create(0.0, 0.0, 5.0); // Z軸上に5.0の位置にカメラを配置
    this.cameraTarget = Vec3.create(0.0, 0.0, 0.0); // カメラの向きを原点に向ける
    this.upDirection = Vec3.create(0.0, 1.0, 0.0); // カメラの上方向をY軸に設定

    // 最初に一度リサイズ処理を行っておく
    this.resize();

    // リサイズイベントの設定
    window.addEventListener("resize", this.resize, false);

    // 深度テストは初期状態で有効
    this.gl.enable(this.gl.DEPTH_TEST);
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
        const image1 = await WebGLUtility.loadImage("/vol7/sample1.jpg");
        const image2 = await WebGLUtility.loadImage("/vol7/sample2.jpg");
        this.texture = WebGLUtility.createTexture(gl, image);
        this.texture1 = WebGLUtility.createTexture(gl, image1);
        this.texture2 = WebGLUtility.createTexture(gl, image2);
        // Promsie を解決
        resolve();
      }
    });
  }

  /**
   * 頂点属性（頂点ジオメトリ）のセットアップを行う
   */
  setupGeometry() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // アスペクト比を維持しながら、ウィンドウのサイズいっぱいにポリゴンを表示
    const sizeWidth = width / 160;
    const sizeHeight = height / 150;

    const color = [1.0, 1.0, 1.0, 1.0];
    this.planeGeometry = WebGLGeometry.plane(sizeWidth, sizeHeight, color);

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
      textureUnit2: gl.getUniformLocation(this.program, "textureUnit2"),
      useTexture: gl.getUniformLocation(this.program, "useTexture"), // テクスチャを使うかどうかのフラグ
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

    // ブレンドの設定
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
  }

  /**
   * 描画を開始する
   */
  start() {
    const gl = this.gl;
    // 途中でテクスチャを切り替えないためここでバインドしておく
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texture1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.texture2);

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
    const v = Mat4.lookAt(
      this.cameraPosition,
      this.cameraTarget,
      this.upDirection
    );
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

    // プログラムオブジェクトを選択し uniform 変数を更新する
    gl.useProgram(this.program);

    // 汎用的な uniform 変数は先にまとめて設定しておく
    const slowFactor = 3.0; // ここでスピードを調整するためのスケーリング値
    const progressValue = (Math.sin(nowTime / slowFactor) + 1.0) / 2.0;
    gl.uniform1f(this.uniformLocation.intensity, 1.0);
    gl.uniform1f(this.uniformLocation.progress, progressValue);
    gl.uniform1f(this.uniformLocation.time, nowTime);
    gl.uniform4f(
      this.uniformLocation.resolution,
      this.width,
      this.height,
      1.0 / this.width,
      1.0 / this.height
    );
    gl.uniform1i(this.uniformLocation.textureUnit, 0);
    gl.uniform1i(this.uniformLocation.textureUnit1, 1);
    gl.uniform1i(this.uniformLocation.textureUnit2, 2);
    // １つ目のポリゴンを描画する @@@
    {
      // モデル座標変換行列（１つ目は奥）
      const m = Mat4.translate(Mat4.identity(), Vec3.create(0.0, 0.0, 0.0));
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
