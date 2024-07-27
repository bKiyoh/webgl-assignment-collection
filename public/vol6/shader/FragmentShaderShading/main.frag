precision mediump float;

varying vec3 vNormal; // 頂点シェーダーから渡された法線
varying vec4 vColor;
varying vec3 vPosition; // 頂点シェーダーから渡された頂点の位置 @@@
uniform vec3 lightPosition; // 点光源の位置 @@@

// ライトベクトルはひとまず定数で定義する
const vec3 light = vec3(1.0, 1.0, 1.0);

void main() {
  // ライトベクトルを計算（点光源の位置 - 頂点の位置）@@@
  vec3 lightDir = normalize(lightPosition - vPosition);

  // 法線とライトベクトルで内積を取る @@@
  float d = dot(normalize(vNormal), lightDir);

// 内積の結果を頂点カラーの RGB 成分に乗算してフラグメントカラーを計算する @@@
  gl_FragColor = vec4(vColor.rgb * max(d, 0.0), vColor.a);
}
