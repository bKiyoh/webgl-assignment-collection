precision mediump float;

uniform sampler2D textureUnit;
uniform sampler2D textureUnit1;
uniform float intensity;
uniform float progress; 
varying vec2 vTexCoord;

uniform vec4 resolution;

// 2D回転行列
mat2 rotate(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

const float PI = 3.1415;

float random() { 
    return fract(sin(2.0 + dot(gl_FragCoord.xy / resolution.xy / 10.0, vec2(12.9898, 4.1414))) * 43758.5453);
}

float hash(float n) { 
    return fract(sin(n) * 1e4); 
}

float hash(vec2 p) { 
    return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); 
}

float hnoise(vec2 x) {
  vec2 i = floor(x);
  vec2 f = fract(x);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 newUV = vTexCoord;

  // 1つ目のエフェクト
  float hn = hnoise(newUV.xy * resolution.xy / 100.0);
  vec2 d = vec2(0., normalize(vec2(0.5, 0.5) - newUV.xy).y);

  // `mod(progress, 1.0)` を使って `progress` をループさせる
  float modProgress = mod(progress, 1.0);

  vec2 uv1 = newUV + d * modProgress / 5.0 * (1.0 + hn / 2.0);
  vec2 uv2 = newUV - d * (1.0 - modProgress) / 5.0 * (1.0 + hn / 2.0);

  // 1つ目のエフェクト結果
  vec4 t1_effect1 = texture2D(textureUnit, uv1);
  vec4 t2_effect1 = texture2D(textureUnit1, uv2);
  vec4 effect1 = mix(t1_effect1, t2_effect1, modProgress);

  // 2つ目のエフェクトの入力として、1つ目のエフェクト結果を使用
  vec2 uvDivided = fract(newUV * vec2(50.0, 1.0));
  
  // 2つ目のエフェクトで intensity を適用
  vec2 uvDisplaced1 = newUV + rotate(3.1415926 / 4.0) * uvDivided * modProgress * 0.1 * intensity;
  vec2 uvDisplaced2 = newUV + rotate(3.1415926 / 4.0) * uvDivided * (1.0 - modProgress) * 0.1 * intensity;

  // 2つ目のエフェクトで、1つ目の結果を基に処理
  vec4 t1_effect2 = texture2D(textureUnit, uvDisplaced1);
  vec4 t2_effect2 = texture2D(textureUnit1, uvDisplaced2);

  vec4 effect2 =  mix(t1_effect2, t2_effect2, modProgress);

  // 最終結果をミックスし、順番に実行
  vec4 finalEffect = mix(effect1, mix(t1_effect2, t2_effect2, modProgress), modProgress);

  gl_FragColor = finalEffect;
}
