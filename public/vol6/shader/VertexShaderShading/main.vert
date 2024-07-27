attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
uniform mat4 mvpMatrix;
uniform mat4 normalMatrix;
uniform vec3 lightPosition;
uniform mat4 mMatrix;
varying vec4 vColor;

void main() {
  // 法線をまず行列で変換する
  vec3 n = (normalMatrix * vec4(normal, 0.0)).xyz;

  // 頂点の位置情報
  vec3 vPosition = (mMatrix * vec4(position, 1.0)).xyz;

  // ライトベクトルを計算（点光源の位置 - 頂点の位置）
  vec3 lightDir = normalize(lightPosition - vPosition);

  // 法線とライトベクトルで内積を取る
  float d = max(dot(normalize(n), lightDir), 0.0);

  // 内積の結果を頂点カラーの RGB 成分に乗算する
  vColor = vec4(color.rgb * d, color.a);

  // MVP 行列と頂点座標を乗算してから出力する
  gl_Position = mvpMatrix * vec4(position, 1.0);
}
