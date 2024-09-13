precision mediump float;

uniform sampler2D textureUnit;
uniform sampler2D textureUnit1;
uniform sampler2D textureUnit2;
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

// ハッシュ関数
float hash(float n) { 
    return fract(sin(n) * 1e4); 
}

float hash(vec2 p) { 
    return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); 
}

// ハッシュベースのノイズ生成
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
  // 参考: https://github.com/akella/webGLImageTransitions/blob/master/js/demo5.js
  float hn = hnoise(newUV.xy * resolution.xy / 100.0);
  
  // UV座標に基づいてノイズを適用
  vec2 d = vec2(0., normalize(vec2(0.5, 0.5) - newUV.xy).y); 

  // UV座標をノイズで歪ませる
  vec2 uv = newUV + d *  progress / 5.0 * (1.0 + hn / 2.0);
  vec2 uv1 = newUV - d * (1.0 -  progress) / 5.0 * (1.0 + hn / 2.0);
  vec2 uv2 = newUV + d *  progress / 10.0 * (1.0 + hn);

  // 1つ目のエフェクト結果
  vec4 t_effect1 = texture2D(textureUnit, uv);
  vec4 t1_effect1 = texture2D(textureUnit1, uv1);
  vec4 t2_effect1 = texture2D(textureUnit2, uv2); 
  
  // 各テクスチャのミックス処理
  vec4 intermediateEffect1 =  mix(t_effect1, t1_effect1,  progress);
  vec4 effect1 = mix(intermediateEffect1, t2_effect1,  progress);

  // ２つ目のエフェクト
  // 参考: https://tympanus.net/codrops/2019/11/05/creative-webgl-image-transitions/
  vec2 uvDivided = fract(newUV * vec2(300.0, 1.0));

  // 回転行列を適用し、UV座標をずらす
  vec2 uvDisplaced1 = newUV + rotate(PI / 4.0) * uvDivided *  progress * 0.1 * intensity;
  vec2 uvDisplaced2 = newUV + rotate(PI / 4.0) * uvDivided * (1.0 -  progress) * 0.1 * intensity;

  // 2つ目のエフェクト結果
  vec4 t_effect2 = texture2D(textureUnit, uvDisplaced1);
  vec4 t1_effect2 = texture2D(textureUnit1, uvDisplaced2);
  vec4 t2_effect2 = texture2D(textureUnit2, uvDisplaced1); // 新たに追加
  
  // 3つのテクスチャを順にミックスする
  float progressStep =  progress * 2.0;
  vec4 intermediateEffect2 = mix(t_effect2, t1_effect2, clamp(progressStep, 0.0, 1.0));
  vec4 effect2 = mix(intermediateEffect2, t2_effect2, clamp(progressStep - 1.0, 0.0, 1.0));

  // 最終的に1つ目と2つ目のエフェクトをミックス
  vec4 finalEffect = mix(effect1, effect2,  progress);

  gl_FragColor = finalEffect;
}
