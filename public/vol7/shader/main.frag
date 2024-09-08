precision mediump float;

uniform sampler2D textureUnit;
uniform bool useTexture;
uniform float globalAlpha; // グローバルアルファ @@@

varying vec4 vColor;
varying vec2 vTexCoord;

void main() {
  // テクスチャから、テクスチャ座標の位置の色をピックする
  vec4 textureColor = texture2D(textureUnit, vTexCoord);

  // テクスチャを使うかどうかのフラグによって分岐
  vec4 outColor = useTexture ? textureColor : vec4(vTexCoord, 0.0, 1.0);

  // グローバルアルファ値を乗算してから出力する @@@
  gl_FragColor = vColor * outColor * vec4(vec3(1.0), globalAlpha);
}

