// Ported from Zoidium plugins/afterclip/shaders/afterclip-shape-chevron.glsl (Chevron).
// Shader by AfterClip; Zoidium normalization by rbstxt (1zworks). MIT, see ../ZOIDIUM-LICENSE.md.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_mix;

uniform float u_Opacity;
uniform vec2 u_Scale;
uniform float u_Rotation;
uniform float u_Offset;
uniform float u_Offset2;
uniform float u_Margin;
uniform float u_StripeWidth;
uniform float u_StripeMargin;
uniform float u_StripeOffset;
uniform float u_StripeRotation;
uniform float u_PatternRotation;
uniform vec2 u_PatternScale;
uniform vec2 u_Position;
uniform vec3 u_Color;

vec4 premultiplyColor(vec4 colorValue) {
    float alpha = clamp(colorValue.a, 0.0, 1.0);
    return vec4(colorValue.rgb * alpha, alpha);
}

vec4 sourceOverColor(vec4 backgroundColor, vec3 effectColor, float effectAlpha) {
    float sourceAlpha = clamp(effectAlpha, 0.0, 1.0);
    float backgroundAlpha = clamp(backgroundColor.a, 0.0, 1.0);
    float remainingBackground = backgroundAlpha * (1.0 - sourceAlpha);
    float outputAlpha = sourceAlpha + remainingBackground;
    vec3 outputColor = effectColor * sourceAlpha + backgroundColor.rgb * remainingBackground;
    return vec4(outputColor, outputAlpha);
}

vec2 objectUv;

vec2 standardObjectUv(vec2 uv) {
    vec2 p = uv * 2.0 - 1.0;
    p -= u_Position;
    p.x *= 16.0 / 9.0;
    
    float standardRotation = u_Rotation * 3.14159265359 / 180.0;
    p = vec2(
        cos(standardRotation) * p.x + sin(standardRotation) * p.y,
        -sin(standardRotation) * p.x + cos(standardRotation) * p.y
    );
    p /= max(abs(u_Scale), vec2(0.0001));
    p.x /= 16.0 / 9.0;
    return p * 0.5 + 0.5;
}

vec2 rotate(vec2 uv, float angle) {
    float cosR = cos(angle);
    float sinR = sin(angle);
    vec2 rotatedUv;
    rotatedUv.x = uv.x * cosR - uv.y * sinR;
    rotatedUv.y = uv.x * sinR + uv.y * cosR;
    return rotatedUv;
}

void zoidiumMain()
{
objectUv = standardObjectUv(v_uv);
vec4 sourceTexel = texture2D(u_image, v_uv);
if (u_Opacity <= 0.0) { gl_FragColor = premultiplyColor(sourceTexel); return; }
  vec4 texel = premultiplyColor(texture2D(u_image, v_uv));

  vec2 uv = objectUv + u_Position / 20.0;
  uv.y = (uv.y - 0.5) * (9.0 / 16.0) + 0.5;

  vec2 centeredUv = uv - 0.5;

  vec2 rotatedUv = rotate(centeredUv, u_PatternRotation * 3.14159265359 / 180.0);

  vec2 rotatedUv2 = rotate(centeredUv, u_StripeRotation * 3.14159265359 / 180.0);

  float newOffset = u_Offset + u_Offset2;
  float newStripeOffset = u_StripeOffset + u_StripeWidth * u_StripeMargin / 2.0;
  
  float manhattanDist = abs(rotatedUv.x) / u_PatternScale.x + abs(rotatedUv.y) / u_PatternScale.y - newOffset;

  if (fract(manhattanDist) < u_Margin && fract((rotatedUv2.y + newStripeOffset / 100.0) / (u_StripeWidth / 100.0)) < u_StripeMargin) {
    texel = sourceOverColor(sourceTexel, u_Color, u_Opacity);
  }

  gl_FragColor = texel;
}


void main() {
  vec4 zoidiumSource = texture2D(u_image, v_uv);
  zoidiumMain();
  gl_FragColor = mix(zoidiumSource, gl_FragColor, clamp(u_mix, 0.0, 1.0));
}
