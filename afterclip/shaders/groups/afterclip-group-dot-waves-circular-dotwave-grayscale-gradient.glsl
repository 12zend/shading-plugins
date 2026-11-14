// Ported from Zoidium plugins/afterclip/shaders/groups/afterclip-group-dot-waves-circular-dotwave-grayscale-gradient.glsl (Grayscale Gradient), as one pass of a group preset.
// Shader by AfterClip; Zoidium normalization by rbstxt (1zworks). MIT, see ../../ZOIDIUM-LICENSE.md.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;

uniform float u_Power;

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



float easeInOutPower(float t, float p) {
  if (t < 0.5) {
    return 0.5 * pow(2.0 * t, p);
  } else {
    return 1.0 - 0.5 * pow(2.0 * (1.0 - t), p);
  }
}

void main()
{
vec4 sourceTexel = texture2D(u_image, v_uv);
  vec4 texel = texture2D(u_image, v_uv);
  float eased = easeInOutPower(v_uv.x, u_Power);
  gl_FragColor = sourceOverColor(sourceTexel, vec3(eased), 1.0);
}
