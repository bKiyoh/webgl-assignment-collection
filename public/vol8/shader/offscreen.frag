precision mediump float;

uniform sampler2D textureUnit;
uniform vec2 mousePosition; // マウス座標を追加
uniform vec2 resolution;    // 画面サイズを追加
uniform float time;
uniform float noiseDistortion; // ノイズの歪み係数値

varying vec4 vColor;
varying vec2 vTexCoord;

const float INVERSE3 = 1.0 / 3.0;
const int   OCT      = 8;         // オクターブ
const float PST      = 0.5;       // パーセンテージ
const float PI       = 3.1415926; // 円周率

// 補間関数
float interpolate(float a, float b, float x){
    float f = (1.0 - cos(x * PI)) * 0.5;
    return a * (1.0 - f) + b * f;
}

// 乱数生成器
float rnd(vec2 n){
  float a  = 0.129898;
  float b  = 0.78233;
  float c  = 437.585453;
  float dt = dot(n ,vec2(a, b));
  float sn = mod(dt, 3.14);
  return fract(sin(sn) * c);
}

// 補間＋乱数
float irnd(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec4 v = vec4(rnd(vec2(i.x,       i.y      )),
                rnd(vec2(i.x + 1.0, i.y      )),
                rnd(vec2(i.x,       i.y + 1.0)),
                rnd(vec2(i.x + 1.0, i.y + 1.0)));
  return interpolate(interpolate(v.x, v.y, f.x), interpolate(v.z, v.w, f.x), f.y);
}
// ノイズ
float noise(vec2 p){
  float t = 0.0;
  for(int i = 0; i < OCT; i++){
    float freq = pow(2.0, float(i));
    float amp  = pow(PST, float(OCT - i));
    t += irnd(vec2(p.x / freq, p.y / freq)) * amp;
  }
  return t;
}
// シームレスノイズ
float snoise(vec2 p, vec2 q, vec2 r){
  return noise(vec2(p.x,       p.y      )) *        q.x  *        q.y  +
         noise(vec2(p.x,       p.y + r.y)) *        q.x  * (1.0 - q.y) +
         noise(vec2(p.x + r.x, p.y      )) * (1.0 - q.x) *        q.y  +
         noise(vec2(p.x + r.x, p.y + r.y)) * (1.0 - q.x) * (1.0 - q.y);
}

void main() {
  // シームレスなバリューノイズを生成する
  float s = snoise(gl_FragCoord.st + time * 20.0, vTexCoord, resolution);

  // 取得したノイズは 0.0 ～ 1.0 なので -1.0 ～ 1.0 に変換する
  float n = s * 2.0 - 1.0;

  // ノイズの歪み係数を乗算する
  n *= noiseDistortion;

  // テクスチャ座標を一度 -1.0 ～ 1.0 にして歪み係数を加算し、元に戻す
  vec2 coord = (vTexCoord * 2.0 - 1.0) + n;
  coord = coord * 0.5 + 0.5;

  // テクスチャから色を取得
  vec4 textureColor = texture2D(textureUnit, vTexCoord);

  // グレースケールの値をノイズに基づいて計算（0.8から1.0の範囲で限定）
  float grayScaleValue = 0.8 + s * 0.2;

  //グレーの色を使用し、雲に近い色にする
  vec4 outColor = vec4(vec3(grayScaleValue), 1.0);

  gl_FragColor =  outColor * vec4(vec3(1.0), 1.0);

}
