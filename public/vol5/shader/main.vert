precision mediump float;

// 頂点の位置
attribute vec3 position;
// 頂点の色
attribute vec4 color;
// フラグメントシェーダに渡すための varying 変数
varying vec4 vColor;

// 経過時間を uniform 変数として受け取る
uniform float time;

void main() {
    // フラグメントシェーダに送る色の情報を varying 変数に代入
    vColor = color;

    // 一定のサイクルで位置を変化させるためのsin関数の使用
    float w = 1.0 + 0.05 * sin(time * 2.0 * 3.14159 / 5.0);

    // 頂点座標の出力
    gl_Position = vec4(position, w);
}
