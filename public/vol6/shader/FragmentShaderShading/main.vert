
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
uniform mat4 mvpMatrix;
uniform mat4 normalMatrix;
varying vec3 vNormal; // 法線をフラグメントシェーダーに渡すための変数
varying vec4 vColor;

// ライトベクトルはひとまず定数で定義する
const vec3 light = vec3(1.0, 1.0, 1.0);

void main() {
  // 法線をまず行列で変換する
  vec3 n = (normalMatrix * vec4(normal, 0.0)).xyz;
  
  // 法線をフラグメントシェーダーに渡す
  vNormal = n;
  
  // 頂点カラーをフラグメントシェーダーに渡す
  vColor = color;

  // MVP 行列と頂点座標を乗算してから出力する
  gl_Position = mvpMatrix * vec4(position, 1.0);
}


/**
 * NOTE:頂点シェーダーで陰影を作るのと、フラグメントシェーダーで作るので違いがあるのか？
 * 頂点単位の計算と１ピクセルごとの計算になるので後者の方がより美しい陰影ができる
 */