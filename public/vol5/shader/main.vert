attribute vec3 position;
attribute vec4 color; // 必ずストライドを考慮したデータ型で定義する @@@

// varying はフラグメントシェーダとの橋渡しをする変数を意味する修飾子 @@@
varying vec4 vColor;

void main() {
  // フラグメントシェーダに送る色の情報を varying 変数に代入 @@@
  vColor = color;

  // 頂点座標の出力
  gl_Position = vec4(position, 1.0);
}

