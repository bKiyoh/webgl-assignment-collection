precision mediump float;

uniform sampler2D textureUnit;
uniform bool useTexture;
uniform float globalAlpha; // グローバルアルファ @@@
uniform vec2 mousePosition; // マウス座標を追加
uniform vec2 resolution;    // 画面サイズを追加

varying vec4 vColor;
varying vec2 vTexCoord;

void main() {
  // テクスチャから、テクスチャ座標の位置の色をピックする
  vec4 textureColor = texture2D(textureUnit, vTexCoord);

  // テクスチャを使うかどうかのフラグによって分岐
  vec4 outColor = vec4(vTexCoord, 0.0, 1.0);

  // フラグメントの座標を取得
  vec2 fragCoord = gl_FragCoord.xy;

  // マウス座標との距離を計算
  float distance = length(fragCoord - mousePosition);

  // 距離に応じて色の強度を計算
  float intensity = 1.0 - (distance / (resolution.x * 0.5));
  intensity = clamp(intensity, 0.0, 1.0);

  // グローバルアルファ値を乗算してから出力する @@@
  gl_FragColor = vColor * outColor * vec4(vec3(intensity), globalAlpha);
}
