"use client";
import { useEffect, useRef } from "react";
import { WebGLUtility } from "@/lib/webGl/webgl.js";
import { blueColors, purpleColors, aquaColors } from "./vol5Color.js";

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
  position; // 頂点の座標情報を格納する配列
  positionStride; // 頂点の座標を構成する要素の数（ストライド）
  positionVBO; // WebGLBuffer （頂点バッファ、Vertex Buffer Object）
  color; // 頂点カラーの座標情報を格納する配列
  colorStride; // 頂点カラーの座標のストライド
  colorVBO; // 頂点カラー座標の VBO
  uniformLocation; // uniform 変数のロケーション
  startTime; // レンダリング開始時のタイムスタンプ
  isRendering; // レンダリングを行うかどうかのフラグ

  constructor(wrapper, width, height) {
    this.wrapper = wrapper;
    this.width = width;
    this.height = height;
    this.render = this.render.bind(this);
  }

  /**
   * 初期化処理を行う
   */
  init() {
    this.canvas = this.wrapper;
    this.gl = WebGLUtility.createWebGLContext(this.canvas);

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
        const VSSource = await WebGLUtility.loadFile("/vol5/shader/main.vert");
        const FSSource = await WebGLUtility.loadFile("/vol5/shader/main.frag");
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
    const createTriangles = (offsetX, offsetY) => [
      // 1つ目の三角形
      // 1-1
      offsetX + 0.0,
      offsetY + 0.0,
      0.0,
      // 1-2
      offsetX + 0.5,
      offsetY + 0.0,
      0.0,
      // 1-3
      offsetX + 0.1545,
      offsetY + 0.4755,
      0.0,
      // 2つ目の三角形
      // 2-1
      offsetX + 0.0,
      offsetY + 0.0,
      0.0,
      // 2-2
      offsetX + 0.1545,
      offsetY + 0.4755,
      0.0,
      // 2-3
      offsetX - 0.4045,
      offsetY + 0.2939,
      0.0,
      // 3つ目の三角形
      // 3-1
      offsetX + 0.0,
      offsetY + 0.0,
      0.0,
      // 3-2
      offsetX - 0.4045,
      offsetY + 0.2939,
      0.0,
      // 3-3
      offsetX - 0.4045,
      offsetY - 0.2939,
      0.0,
      // 4つ目の三角形
      // 4-1
      offsetX + 0.0,
      offsetY + 0.0,
      0.0,
      // 4-2
      offsetX - 0.4045,
      offsetY - 0.2939,
      0.0,
      // 4-3
      offsetX + 0.1545,
      offsetY - 0.4755,
      0.0,
      // 5つ目の三角形
      // 5-1
      offsetX + 0.0,
      offsetY + 0.0,
      0.0,
      // 5-2
      offsetX + 0.1545,
      offsetY - 0.4755,
      0.0,
      // 5-3
      offsetX + 0.5,
      offsetY + 0.0,
      0.0,
    ];

    const offset = 0.5;

    this.position = [
      ...createTriangles(-1.0 + -offset, -1.0 + offset),
      ...createTriangles(-0.5 + -offset, -0.5 + offset),
      ...createTriangles(-offset, offset),
      ...createTriangles(0.5 + -offset, 0.5 + offset),
      ...createTriangles(1.0 + -offset, 1.0 + offset),

      ...createTriangles(-0.5 + -offset, -0.5 + -offset),
      ...createTriangles(-offset, -offset),
      ...createTriangles(0.0, 0.0),
      ...createTriangles(offset, offset),
      ...createTriangles(0.5 + offset, 0.5 + offset),

      ...createTriangles(-1.0 + offset, -1.0 + -offset),
      ...createTriangles(-0.5 + offset, -0.5 + -offset),
      ...createTriangles(offset, -offset),
      ...createTriangles(0.5 + offset, 0.5 + -offset),
      ...createTriangles(1.0 + offset, 1.0 + -offset),
    ];

    // 要素数は XYZ の３つ
    this.positionStride = 3;
    // VBO を生成
    this.positionVBO = WebGLUtility.createVBO(this.gl, this.position);

    this.color = [
      ...aquaColors,
      ...purpleColors,
      ...blueColors,
      ...aquaColors,
      ...purpleColors,
      ...aquaColors,
      ...purpleColors,
      ...blueColors,
      ...aquaColors,
      ...purpleColors,
      ...aquaColors,
      ...purpleColors,
      ...blueColors,
      ...aquaColors,
      ...purpleColors,
    ];

    // 要素数は RGBA の４つ
    this.colorStride = 4;
    // VBO を生成
    this.colorVBO = WebGLUtility.createVBO(this.gl, this.color);
  }

  /**
   * 頂点属性のロケーションに関するセットアップを行う
   */
  setupLocation() {
    const gl = this.gl;
    // attribute
    const positionAttributeLocation = gl.getAttribLocation(
      this.program,
      "position"
    );
    const colorAttributeLocation = gl.getAttribLocation(this.program, "color");
    const vboArray = [this.positionVBO, this.colorVBO];
    const attributeLocationArray = [
      positionAttributeLocation,
      colorAttributeLocation,
    ];
    const strideArray = [this.positionStride, this.colorStride];
    WebGLUtility.enableBuffer(
      gl,
      vboArray,
      attributeLocationArray,
      strideArray
    );
    this.uniformLocation = {
      time: gl.getUniformLocation(this.program, "time"),
    };
  }

  /**
   * レンダリングのためのセットアップを行う
   */
  setupRendering() {
    const gl = this.gl;
    // ビューポートを設定する
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // クリアする色を設定する（RGBA で 0.0 ～ 1.0 の範囲で指定する）
    gl.clearColor(0.99, 0.99, 0.99, 1.0);
    // 実際にクリアする（gl.COLOR_BUFFER_BIT で色をクリアしろ、という指定になる）
    gl.clear(gl.COLOR_BUFFER_BIT);
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

    // ビューポートの設定やクリア処理は毎フレーム呼び出す
    this.setupRendering();

    // 現在までの経過時間を計算し、秒単位に変換する
    const nowTime = (Date.now() - this.startTime) * 0.001;

    // プグラムオブジェクトを選択
    gl.useProgram(this.program);

    // ロケーションを指定して、uniform 変数の値を更新する（GPU に送る）
    gl.uniform1f(this.uniformLocation.time, nowTime);

    // ドローコール（描画命令）
    gl.drawArrays(gl.TRIANGLES, 0, this.position.length / this.positionStride);
  }
}
