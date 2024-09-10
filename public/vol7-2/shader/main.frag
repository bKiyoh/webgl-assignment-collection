precision mediump float;

uniform bool        reflection;  // 法線による反射を行うかどうか
uniform vec3        eyePosition; // 視点の座標
uniform samplerCube textureUnit; // キューブマップテクスチャ
varying vec3        vPosition;   // モデル座標変換後の頂点の位置
varying vec3        vNormal;     // 法線

void main() {
  // 頂点座標とカメラの位置から視線ベクトルを算出
  vec3 eyeDirection = normalize(vPosition - eyePosition);

  // 念の為、確実に単位化してから使う
  vec3 normal = normalize(vNormal);

  // 反射ベクトルに用いる変数（初期状態は法線と同じにしておく）
  vec3 reflectVector = normal;

  // もし反射有効なら reflect で反射ベクトルを求める
  if (reflection == true) {
    reflectVector = reflect(eyeDirection, normal);
  }
  // 反射ベクトルを使ってキューブマップテクスチャからサンプリング
  vec4 envColor = textureCube(textureUnit, reflectVector);

  gl_FragColor = envColor;
}