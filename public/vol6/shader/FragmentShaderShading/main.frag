precision mediump float;

varying vec3 vNormal; // 頂点シェーダーから渡された法線 @@@
varying vec4 vColor;

// ライトベクトルはひとまず定数で定義する
const vec3 light = vec3(1.0, 1.0, 1.0);

void main() {
  // 変換した法線とライトベクトルで内積を取る @@@
  float d = dot(normalize(vNormal), normalize(light));

  // 内積の結果を頂点カラーの RGB 成分に乗算してフラグメントカラーを計算する @@@
  gl_FragColor = vec4(vColor.rgb * d, vColor.a);
}
