precision mediump float;

varying vec4 vColor;

void main() {
  // フラグメントシェーダでは単に色をそのまま出力する
  gl_FragColor = vColor;
}

