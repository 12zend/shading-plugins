// Ported from Zoidium plugins/afterclip/shaders/afterclip-repeat-gradient-linear-repeat.glsl (Gradient Linear Repeat).
// Shader by AfterClip; Zoidium normalization by rbstxt (1zworks). MIT, see ../ZOIDIUM-LICENSE.md.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_mix;

uniform float u_Rotation;
uniform vec2 u_Offset;
uniform float u_Repeat;
uniform float u_RepeatScale;
uniform int u_BlendOrder;
uniform vec3 u_StartColor;
uniform vec3 u_EndColor;

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



vec4 blendColors(vec4 baseColor, vec4 overlayColor) {
    float sourceAlpha = clamp(overlayColor.a, 0.0, 1.0);
    float backgroundAlpha = clamp(baseColor.a, 0.0, 1.0);
    float remainingBackground = backgroundAlpha * (1.0 - sourceAlpha);
    float outputAlpha = sourceAlpha + remainingBackground;
    vec3 outputColor = overlayColor.rgb * sourceAlpha + baseColor.rgb * (1.0 - sourceAlpha);
    return vec4(outputColor, outputAlpha);
}
const float PI = 3.141592653589793;
const float ASPECT = 16.0 / 9.0;

vec2 rotateAspect(vec2 uv, float angle, vec2 center) {
  uv -= center;
  uv.x *= ASPECT;
  float rad = radians(angle);
  float cosA = cos(rad);
  float sinA = sin(rad);
  uv = mat2(cosA, -sinA, sinA, cosA) * uv;
  uv.x /= ASPECT;
  uv += center;
  return uv;
}

vec2 scaleUV(vec2 uv, float scale, vec2 center) {
  return (uv - center) / scale + center;
}

void zoidiumMain()
{
vec4 sourceTexel = texture2D(u_image, v_uv);
  vec2 offsetPixels = u_Offset / vec2(-1920.0, -1080.0);
  vec4 color = vec4(0.0);
  vec2 center = vec2(0.5);
  float angleIncrement = u_Rotation / float(u_Repeat);
  vec2 offsetIncrement = offsetPixels / float(u_Repeat);
  float scaleIncrement = (u_RepeatScale - 1.0) / float(u_Repeat);

  if (u_BlendOrder == 0) {
    for (int i = 0; i < 1000; ++i) {
      if (float(i) >= u_Repeat) break;
      float t = float(i) / max(u_Repeat - 1.0, 1.0);
      vec3 blendedColor = mix(u_StartColor, u_EndColor, t);
      float angle = float(i) * angleIncrement;
      vec2 offset = float(i) * offsetIncrement;
      float scale = 1.0 + float(i) * scaleIncrement;
      vec2 uv = scaleUV(v_uv + offset, scale, center);
      vec2 rotatedUV = rotateAspect(uv, -angle, center);
      float alpha = texture2D(u_image, rotatedUV).a;
      vec4 texel = vec4(blendedColor, alpha);
      color = blendColors(color, texel);
    }
  } else {
    for (int i = 999; i >= 0; --i) {
      if (float(i) >= u_Repeat) continue;
      float t = float(i) / max(u_Repeat - 1.0, 1.0);
      vec3 blendedColor = mix(u_StartColor, u_EndColor, t);
      float angle = float(i) * angleIncrement;
      vec2 offset = float(i) * offsetIncrement;
      float scale = 1.0 + float(i) * scaleIncrement;
      vec2 uv = scaleUV(v_uv + offset, scale, center);
      vec2 rotatedUV = rotateAspect(uv, -angle, center);
      float alpha = texture2D(u_image, rotatedUV).a;
      vec4 texel = vec4(blendedColor, alpha);
      color = blendColors(color, texel);
    }
  }

  gl_FragColor = color;
}


void main() {
  vec4 zoidiumSource = texture2D(u_image, v_uv);
  zoidiumMain();
  gl_FragColor = mix(zoidiumSource, gl_FragColor, clamp(u_mix, 0.0, 1.0));
}
