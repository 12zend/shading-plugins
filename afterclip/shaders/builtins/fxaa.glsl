// Panzoid's built-in "Antialiasing" (FXAA) effect, used inside the AfterClip group presets. A self-contained
// FXAA pass (the classic "FXAA 3.11 lite" filter): blurs along detected edges and keeps the alpha channel.
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;

const float FXAA_REDUCE_MIN = 1.0 / 128.0;
const float FXAA_REDUCE_MUL = 1.0 / 8.0;
const float FXAA_SPAN_MAX = 8.0;

void main() {
  vec2 texel = 1.0 / max(u_resolution, vec2(1.0));
  vec3 lumaWeights = vec3(0.299, 0.587, 0.114);
  vec4 colorM = texture2D(u_image, v_uv);
  float lumaNW = dot(texture2D(u_image, v_uv + vec2(-1.0, -1.0) * texel).rgb, lumaWeights);
  float lumaNE = dot(texture2D(u_image, v_uv + vec2(1.0, -1.0) * texel).rgb, lumaWeights);
  float lumaSW = dot(texture2D(u_image, v_uv + vec2(-1.0, 1.0) * texel).rgb, lumaWeights);
  float lumaSE = dot(texture2D(u_image, v_uv + vec2(1.0, 1.0) * texel).rgb, lumaWeights);
  float lumaM = dot(colorM.rgb, lumaWeights);
  float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
  float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

  vec2 dir = vec2(-((lumaNW + lumaNE) - (lumaSW + lumaSE)), (lumaNW + lumaSW) - (lumaNE + lumaSE));
  float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);
  float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
  dir = clamp(dir * rcpDirMin, vec2(-FXAA_SPAN_MAX), vec2(FXAA_SPAN_MAX)) * texel;

  vec4 colorA = 0.5 * (
    texture2D(u_image, v_uv + dir * (1.0 / 3.0 - 0.5)) +
    texture2D(u_image, v_uv + dir * (2.0 / 3.0 - 0.5)));
  vec4 colorB = colorA * 0.5 + 0.25 * (
    texture2D(u_image, v_uv + dir * -0.5) +
    texture2D(u_image, v_uv + dir * 0.5));
  float lumaB = dot(colorB.rgb, lumaWeights);
  gl_FragColor = (lumaB < lumaMin || lumaB > lumaMax) ? colorA : colorB;
}
