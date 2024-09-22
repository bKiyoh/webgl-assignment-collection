precision mediump float;

uniform sampler2D textureUnit;
uniform bool useTypeOne;
uniform float time;
uniform float alpha;
uniform vec2 mousePosition;    // マウス座標
uniform vec2 resolution;       // 画面サイズ
varying vec2 vTexCoord;

const float INVERSE3 = 1.0 / 3.0;

// 乱数生成（その１）
float rnd(vec2 p){
  return fract(sin(dot(p ,vec2(12.9898,78.233))) * 43758.5453);
}

// 乱数生成器（その２）
float rnd2(vec2 n){
  float a  = 0.129898;
  float b  = 0.78233;
  float c  = 437.585453;
  float dt = dot(n ,vec2(a, b));
  float sn = mod(dt, 3.14);
  return fract(sin(sn) * c);
}

void main() {
  // テクスチャの色を取得
  vec4 samplerColor = texture2D(textureUnit, vTexCoord);

  // フラグメントの座標を取得
  vec2 fragCoord = gl_FragCoord.xy;

  // マウス座標との距離を計算
  float dist = length(fragCoord - mousePosition);

  // ノイズを適用する半径を定義
  float radius = 500.0; // ノイズを適用する範囲（ピクセル単位）

  // 距離に基づいてマスクを計算（ノイズの適用度合い）
  float mask = 1.0 - smoothstep(0.0, radius, dist);

  // ホワイトノイズを取得
  float noise = 0.0;
  if (useTypeOne) {
    noise = rnd(fragCoord + time);
  } else {
    noise = rnd2(fragCoord + time);
  }

  // ノイズの明るさを補正し、マスクを適用
  noise *= alpha * mask;

  // ノイズカラーを生成
  vec3 noiseColor = vec3(noise);

  // テクスチャカラーとノイズカラーをブレンド
  vec3 color = samplerColor.rgb + noiseColor;

  // 最終出力カラーを合成する
  gl_FragColor = vec4(color, 1.0);
}
