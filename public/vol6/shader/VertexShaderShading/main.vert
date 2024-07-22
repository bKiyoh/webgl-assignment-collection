
attribute vec3 position;
attribute vec3 normal; // 頂点法線 @@@
attribute vec4 color;
uniform mat4 mvpMatrix;
varying vec4 vColor;

// ライトベクトルはひとまず定数で定義する @@@
const vec3 light = vec3(1.0, 1.0, 1.0);

void main() {
  // 単位化した法線と単位化したライトベクトルで内積を取る @@@
  float d = dot(normalize(normal), normalize(light));

  // 内積の結果を頂点カラーの RGB 成分に乗算する @@@
  vColor = vec4(color.rgb * d, color.a);

  // MVP 行列と頂点座標を乗算してから出力する
  gl_Position = mvpMatrix * vec4(position, 1.0);
}

