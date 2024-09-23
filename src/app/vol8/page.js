"use client";
import { useEffect, useRef } from "react";
import { WebGLUtility } from "@/lib/webGl/webgl.js";
import { Vec3, Mat4 } from "@/lib/webGl/math";
import { WebGLGeometry } from "@/lib/webGl/geometry.js";
import { WebGLOrbitCamera } from "@/lib/webGl/camera.js";

export default function Page() {
  const initializedRef = useRef(false);
  const initAndLoad = async (app) => {
    app.init();
    await app.load();
    app.setupGeometry();
    app.setupLocation();
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
  mousePosition; // マウス座標を保持する変数
  timeSpeed; // 時間の経過速度係数
  alpha; // ノイズに適用するアルファ値
  noiseDistortion; // ノイズの歪み係数

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
      min: 0.1, // カメラが寄れる最小距離
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
    this.textureVisibility = false;

    // マウス位置の初期化（キャンバス外の座標）
    this.mousePosition = {
      x: -9999,
      y: -9999,
    };

    // 時間の経過
    this.timeSpeed = 0.5;

    // ノイズのアルファは 0.5 で半透明
    this.alpha = 0.5;

    // わずかに歪ませる
    this.noiseDistortion = 0.3;
  }

  /**
   * マウス移動時のイベントハンドラ
   * キャンバスの原点は左上にあるため、Y座標を反転して
   * 一般的な座標系（左下が原点）に合わせる
   */
  onMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePosition.x = event.clientX - rect.left;
    // Y座標を反転
    this.mousePosition.y = this.canvas.height - (event.clientY - rect.top);
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
        // 最終シーン用のシェーダ
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

        // オフスクリーン用のシェーダ
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
        resolve();
      }
    });
  }

  /**
   * 頂点属性（頂点ジオメトリ）のセットアップを行う
   */
  setupGeometry() {
    const color = [1.0, 1.0, 1.0, 1.0];
    // plane は this.renderProgram と一緒に使う
    const planeSize = 2.0;
    this.planeGeometry = WebGLGeometry.plane(planeSize, planeSize, color);
    this.planeVBO = [
      WebGLUtility.createVBO(this.gl, this.planeGeometry.position),
      WebGLUtility.createVBO(this.gl, this.planeGeometry.texCoord),
    ];
    this.planeIBO = WebGLUtility.createIBO(this.gl, this.planeGeometry.index);

    const segment = 64;
    const radius = 1.0;
    this.sphereGeometry = WebGLGeometry.sphere(segment, segment, radius, color);
    // VBO と IBO を生成する
    this.sphereVBO = [
      WebGLUtility.createVBO(this.gl, this.sphereGeometry.position),
      WebGLUtility.createVBO(this.gl, this.sphereGeometry.normal),
      WebGLUtility.createVBO(this.gl, this.sphereGeometry.color),
      WebGLUtility.createVBO(this.gl, this.sphereGeometry.texCoord),
    ];
    this.sphereIBO = WebGLUtility.createIBO(this.gl, this.sphereGeometry.index);
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
      time: gl.getUniformLocation(this.renderProgram, "time"), // 時間の経過
      alpha: gl.getUniformLocation(this.renderProgram, "alpha"), // ノイズのアルファ
      mousePosition: gl.getUniformLocation(this.renderProgram, "mousePosition"), // マウス座標
      noiseDistortion: gl.getUniformLocation(
        this.renderProgram,
        "noiseDistortion"
      ), // ノイズの歪み係数
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
      resolution: gl.getUniformLocation(this.offscreenProgram, "resolution"), // 画面サイズ
      time: gl.getUniformLocation(this.offscreenProgram, "time"), // 時間の経過
      noiseDistortion: gl.getUniformLocation(
        this.offscreenProgram,
        "noiseDistortion"
      ), // ノイズの歪み係数
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
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
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
    gl.clearColor(0.15, 0.6, 0.8, 1.0);
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
    if (this.isRendering === true) {
      requestAnimationFrame(this.render);
    }
    const nowTime = (Date.now() - this.startTime) * 0.001;

    // - オフスクリーンレンダリング -------------------------------------------
    {
      // レンダリングのセットアップ
      this.setupOffscreenRendering();

      // ビュー行列とプロジェクション行列を作成
      const v = this.camera.update();
      const fovy = 45;
      const aspect = this.canvas.width / this.canvas.height;
      const near = 0.1;
      const far = 20.0;
      const p = Mat4.perspective(fovy, aspect, near, far);
      const vp = Mat4.multiply(p, v);

      // VBO と IBO をバインド
      WebGLUtility.enableBuffer(
        gl,
        this.sphereVBO,
        this.offscreenAttLocation,
        this.offscreenAttStride,
        this.sphereIBO
      );

      // 共通のユニフォームを設定
      gl.uniform3fv(
        this.offscreenUniLocation.lightVector,
        Vec3.create(1.0, 1.0, 1.0)
      );
      gl.uniform1i(this.offscreenUniLocation.textureUnit, 0);
      gl.uniform2f(
        this.offscreenUniLocation.resolution,
        this.canvas.width,
        this.canvas.height
      );
      gl.uniform1f(this.offscreenUniLocation.time, this.timeSpeed * nowTime);
      gl.uniform1f(
        this.offscreenUniLocation.noiseDistortion,
        this.noiseDistortion
      );
      // --- 第一の球体を描画 ---
      {
        let m = Mat4.identity();
        const x = 0.0;
        const y = 0.5;
        m = Mat4.translate(m, Vec3.create(x, y, 0.0));
        // MVP 行列と法線変換行列を計算
        const mvp = Mat4.multiply(vp, m);
        const normalMatrix = Mat4.transpose(Mat4.inverse(m));
        // シェーダーに行列を送る
        gl.uniformMatrix4fv(this.offscreenUniLocation.mvpMatrix, false, mvp);
        gl.uniformMatrix4fv(
          this.offscreenUniLocation.normalMatrix,
          false,
          normalMatrix
        );
        // 球体を描画
        gl.drawElements(
          gl.TRIANGLES,
          this.sphereGeometry.index.length,
          gl.UNSIGNED_SHORT,
          0
        );
      }

      // --- 第二の球体を描画 ---
      {
        let m = Mat4.identity();
        const x = -0.5;
        const y = -0.25;
        m = Mat4.translate(m, Vec3.create(x, y, 0.0));
        const mvp = Mat4.multiply(vp, m);
        const normalMatrix = Mat4.transpose(Mat4.inverse(m));
        gl.uniformMatrix4fv(this.offscreenUniLocation.mvpMatrix, false, mvp);
        gl.uniformMatrix4fv(
          this.offscreenUniLocation.normalMatrix,
          false,
          normalMatrix
        );
        gl.drawElements(
          gl.TRIANGLES,
          this.sphereGeometry.index.length,
          gl.UNSIGNED_SHORT,
          0
        );
      }

      // --- 第三の球体を描画 ---
      {
        let m = Mat4.identity();
        const x = 1.5;
        const y = -0.25;
        m = Mat4.translate(m, Vec3.create(x, y, 0.0));
        const mvp = Mat4.multiply(vp, m);
        const normalMatrix = Mat4.transpose(Mat4.inverse(m));
        gl.uniformMatrix4fv(this.offscreenUniLocation.mvpMatrix, false, mvp);
        gl.uniformMatrix4fv(
          this.offscreenUniLocation.normalMatrix,
          false,
          normalMatrix
        );
        gl.drawElements(
          gl.TRIANGLES,
          this.sphereGeometry.index.length,
          gl.UNSIGNED_SHORT,
          0
        );
      }

      // --- 第四の球体を描画 ---
      {
        let m = Mat4.identity();
        const x = 3.5;
        const y = -1.5;
        m = Mat4.translate(m, Vec3.create(x, y, 0.0));
        const mvp = Mat4.multiply(vp, m);
        const normalMatrix = Mat4.transpose(Mat4.inverse(m));
        gl.uniformMatrix4fv(this.offscreenUniLocation.mvpMatrix, false, mvp);
        gl.uniformMatrix4fv(
          this.offscreenUniLocation.normalMatrix,
          false,
          normalMatrix
        );
        gl.drawElements(
          gl.TRIANGLES,
          this.sphereGeometry.index.length,
          gl.UNSIGNED_SHORT,
          0
        );
      }

      // --- 第五の球体を描画 ---
      {
        let m = Mat4.identity();
        const x = -3.5;
        const y = 0.75;
        m = Mat4.translate(m, Vec3.create(x, y, 1.0));
        const mvp = Mat4.multiply(vp, m);
        const normalMatrix = Mat4.transpose(Mat4.inverse(m));
        gl.uniformMatrix4fv(this.offscreenUniLocation.mvpMatrix, false, mvp);
        gl.uniformMatrix4fv(
          this.offscreenUniLocation.normalMatrix,
          false,
          normalMatrix
        );
        gl.drawElements(
          gl.TRIANGLES,
          this.sphereGeometry.index.length,
          gl.UNSIGNED_SHORT,
          0
        );
      }

      // --- 第六の球体を描画 ---
      {
        let m = Mat4.identity();
        const x = -2.5;
        const y = -1.8;
        m = Mat4.translate(m, Vec3.create(x, y, 0.0));
        const mvp = Mat4.multiply(vp, m);
        const normalMatrix = Mat4.transpose(Mat4.inverse(m));
        gl.uniformMatrix4fv(this.offscreenUniLocation.mvpMatrix, false, mvp);
        gl.uniformMatrix4fv(
          this.offscreenUniLocation.normalMatrix,
          false,
          normalMatrix
        );
        gl.drawElements(
          gl.TRIANGLES,
          this.sphereGeometry.index.length,
          gl.UNSIGNED_SHORT,
          0
        );
      }

      // --- 第七の球体を描画 ---
      {
        let m = Mat4.identity();
        const x = 3.5;
        const y = 2.8;
        m = Mat4.translate(m, Vec3.create(x, y, 0.0));
        const mvp = Mat4.multiply(vp, m);
        const normalMatrix = Mat4.transpose(Mat4.inverse(m));
        gl.uniformMatrix4fv(this.offscreenUniLocation.mvpMatrix, false, mvp);
        gl.uniformMatrix4fv(
          this.offscreenUniLocation.normalMatrix,
          false,
          normalMatrix
        );
        gl.drawElements(
          gl.TRIANGLES,
          this.sphereGeometry.index.length,
          gl.UNSIGNED_SHORT,
          0
        );
      }
    }
    // ------------------------------------------------------------------------

    // - 最終シーンのレンダリング ---------------------------------------------
    {
      this.setupRendering();

      // VBO と IBO
      WebGLUtility.enableBuffer(
        gl,
        this.planeVBO,
        this.renderAttLocation,
        this.renderAttStride,
        this.planeIBO
      );
      // ユニフォーム変数を設定
      gl.uniform1i(this.renderUniLocation.textureUnit, 0);
      gl.uniform1f(this.renderUniLocation.time, this.timeSpeed * nowTime);
      gl.uniform1f(this.renderUniLocation.alpha, this.alpha);
      gl.uniform2f(
        this.renderUniLocation.mousePosition,
        this.mousePosition.x,
        this.mousePosition.y
      );
      gl.uniform1f(
        this.renderUniLocation.noiseDistortion,
        this.noiseDistortion
      );
      // 平面を描画
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
