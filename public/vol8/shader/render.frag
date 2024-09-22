precision mediump float;

uniform sampler2D textureUnit;
uniform bool useTypeOne;
uniform float time;
uniform float alpha;
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
  // テクスチャの色
  vec4 samplerColor = texture2D(textureUnit, vTexCoord);

  // グレイスケール化
  float gray = dot(vec3(1.0), samplerColor.rgb) * INVERSE3;

  // グレイスケール化した色を補正する
  gray = gray * (1.0 - alpha);

  // ホワイトノイズを取得する
  float noise = 0.0;
  if (useTypeOne == true) {
    noise = rnd(gl_FragCoord.xy + time);
  } else {
    noise = rnd2(gl_FragCoord.xy + time);
  }

  // ノイズの明るさを補正する
  noise *= alpha;

  // 最終出力カラーを合成する
  gl_FragColor = vec4(vec3(gray + noise), 1.0);
}


