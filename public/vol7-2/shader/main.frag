precision mediump float;

uniform bool        refraction;      // 屈折を行うかどうか @@@
uniform float       refractiveIndex; // 屈折率 @@@
uniform vec3        eyePosition;     // 視点の座標
uniform samplerCube textureUnit;     // キューブマップテクスチャ
varying vec3        vPosition;       // モデル座標変換後の頂点の位置
varying vec3        vNormal;         // 法線

void main() {
  // 頂点座標とカメラの位置から視線ベクトルを算出
  vec3 eyeDirection = normalize(vPosition - eyePosition);

  // 念の為、確実に単位化してから使う
  vec3 normal = normalize(vNormal);

  // 屈折ベクトルに用いる変数（初期状態は法線と同じにしておく）
  vec3 refractVector = normal;

  // もし屈折有効なら refract で屈折ベクトルを求める @@@
  if (refraction == true) {
    // 屈折率の比（大気を 1.0 として、入射するオブジェクトの屈折率で割る） @@@
    float eta = 1.0 / refractiveIndex;
    // refract の第三引数に eta を指定する @@@
    refractVector = refract(eyeDirection, normal, eta);
  }
  // 屈折ベクトルを使ってキューブマップテクスチャからサンプリング
  vec4 envColor = textureCube(textureUnit, refractVector);

  gl_FragColor = envColor;
}