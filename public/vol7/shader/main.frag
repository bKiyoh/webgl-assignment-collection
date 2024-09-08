precision mediump float;

uniform sampler2D textureUnit;
uniform bool useTexture; // テクスチャを使うかどうか @@@

varying vec4 vColor;
varying vec2 vTexCoord;

void main() {
  // テクスチャから、テクスチャ座標の位置の色をピックする
  vec4 textureColor = texture2D(textureUnit, vTexCoord);

  // テクスチャを使うかどうかのフラグによって分岐 @@@
  vec4 outColor = useTexture ? textureColor : vec4(vTexCoord, 0.0, 1.0);

  gl_FragColor = vColor * outColor;
}

