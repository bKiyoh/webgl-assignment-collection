precision mediump float;

// データ型と変数名が頂点シェーダと一致する必要がある点に注意 @@@
varying vec4 vColor;

void main() {
  // ここではフラグメントの色（ピクセルの色）は varying 変数をそのまま出力 @@@
  gl_FragColor = vColor;
}