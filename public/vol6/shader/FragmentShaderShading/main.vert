
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
uniform mat4 mvpMatrix;
uniform mat4 normalMatrix;
uniform mat4 mMatrix; // モデル行列。オブジェクトの位置、回転、スケーリングを定義する行列 @@@
varying vec3 vPosition; // フラグメントシェーダーに渡す頂点位置 @@@
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

  // 頂点の位置情報をフラグメントシェーダーに渡す @@@
  vPosition = (mMatrix * vec4(position, 1.0)).xyz;

  // MVP 行列と頂点座標を乗算してから出力する
  gl_Position = mvpMatrix * vec4(position, 1.0);
}


/**
 * NOTE:頂点シェーダーで陰影を作るのと、フラグメントシェーダーで作るので違いがあるのか？
 * 頂点単位の計算と１ピクセルごとの計算になるので後者の方がより美しい陰影ができる
 */