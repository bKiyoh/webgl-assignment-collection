precision mediump float;

// 経過時間を uniform 変数（の浮動小数点）として受け取る
uniform float time;

// データ型と変数名が頂点シェーダと一致する必要がある点に注意
varying vec4 vColor;

void main() {
  // 時間の経過からサイン波を作り、絶対値で点滅させるようにする
  vec3 rgb = vColor.rgb * abs(sin(1.0));
  // フラグメントの色
  gl_FragColor = vec4(rgb, vColor.a);
  
}