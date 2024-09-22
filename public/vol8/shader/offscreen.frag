precision mediump float;

uniform sampler2D textureUnit;
uniform bool useTexture;
uniform float globalAlpha; // グローバルアルファ @@@
uniform vec2 mousePosition; // マウス座標を追加
uniform vec2 resolution;    // 画面サイズを追加

varying vec4 vColor;
varying vec2 vTexCoord;

void main() {
    // テクスチャから色を取得
    vec4 textureColor = texture2D(textureUnit, vTexCoord);

    // グレースケールの値を計算
    float grayScaleValue = (vTexCoord.x + vTexCoord.y) * 0.5;

    // useTexture が false の場合はグレースケールの色を使用
    vec4 outColor = useTexture ? textureColor : vec4(vec3(grayScaleValue), 1.0);

    // 出力色
    gl_FragColor = vColor * outColor * vec4(vec3(1.0), globalAlpha);
}
