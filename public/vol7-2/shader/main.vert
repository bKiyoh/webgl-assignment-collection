
attribute vec3 position;
attribute vec3 normal;
uniform mat4 mMatrix;
uniform mat4 mvpMatrix;
uniform mat4 normalMatrix;
varying vec3 vPosition;
varying vec3 vNormal;

void main() {
  // 頂点のモデル座標変換
  vPosition = (mMatrix * vec4(position, 1.0)).xyz;
  // 法線の変換
  vNormal = normalize((normalMatrix * vec4(normal, 0.0)).xyz);

  gl_Position = mvpMatrix * vec4(position, 1.0);
}
