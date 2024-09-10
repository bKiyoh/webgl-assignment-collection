precision mediump float;

uniform sampler2D textureUnit;
uniform sampler2D textureUnit1;
uniform vec2 windowSize;
uniform vec2 textureSize;
uniform float progress; 
varying vec2 vTexCoord;

// 2D回転行列
mat2 rotate(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 newUV = vTexCoord;

  // newUV座標を基に、テクスチャを5x1で分割
  vec2 uvDivided = fract(newUV * vec2(50.0, 1.0));

  vec2 uvDisplaced1 = newUV + rotate(3.1415926 / 4.0) * uvDivided * progress * 0.1;
  vec2 uvDisplaced2 = newUV + rotate(3.1415926 / 4.0) * uvDivided * (1.0 - progress) * 0.1;

  // 2つのテクスチャを取得
  vec4 t1 = texture2D(textureUnit, uvDisplaced1);
  vec4 t2 = texture2D(textureUnit1, uvDisplaced2);

  // 2つのテクスチャを進行度に応じてミックス
  gl_FragColor = mix(t1, t2, progress);
}