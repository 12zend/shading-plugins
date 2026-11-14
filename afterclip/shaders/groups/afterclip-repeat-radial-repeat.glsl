// Ported from Zoidium plugins/afterclip/shaders/afterclip-repeat-radial-repeat.glsl (Radial Repeat), as one pass of a group preset.
// Shader by AfterClip; Zoidium normalization by rbstxt (1zworks). MIT, see ../../ZOIDIUM-LICENSE.md.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;

uniform float u_Repeat;
uniform float u_Wide;
uniform int u_BlendOrder;

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

vec4 blendColors(vec4 baseColor, vec4 overlayColor) {
    float sourceAlpha = clamp(overlayColor.a, 0.0, 1.0);
    float backgroundAlpha = clamp(baseColor.a, 0.0, 1.0);
    float remainingBackground = backgroundAlpha * (1.0 - sourceAlpha);
    float outputAlpha = sourceAlpha + remainingBackground;
    vec3 outputColor = overlayColor.rgb * sourceAlpha + baseColor.rgb * (1.0 - sourceAlpha);
    return vec4(outputColor, outputAlpha);
}

void main()
{
vec4 sourceTexel = texture2D(u_image, v_uv);
  vec4 color = vec4(0.0);
  vec2 center = vec2(0.5);

  if (u_BlendOrder == 0) {
    
    for (int i = 0; i < 100; ++i) {
      if (float(i) >= u_Repeat) break;

      float angle = float(i) * u_Wide;
      vec2 rotatedUV = rotateAspect(v_uv, -angle, center);

      vec4 texel = texture2D(u_image, rotatedUV);
      color = blendColors(color, texel);
    }
  } else {
    
    for (int i = 99; i >= 0; --i) {
      if (float(i) >= u_Repeat) continue;

      float angle = float(i) * u_Wide;
      vec2 rotatedUV = rotateAspect(v_uv, -angle, center);

      vec4 texel = texture2D(u_image, rotatedUV);
      color = blendColors(color, texel);
    }
  }

  gl_FragColor = color;
}
