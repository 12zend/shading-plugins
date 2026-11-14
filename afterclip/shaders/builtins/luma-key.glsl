// Panzoid's built-in "Luma Key" effect, used inside the AfterClip group presets: pixels darker than
// `threshold` become transparent (brighter ones with `invert`), with a soft ramp of `soften` around it.
// `mask` outputs the key itself as white instead of the keyed image.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform float u_threshold;
uniform float u_soften;
uniform int u_invert;
uniform int u_mask;

void main() {
  vec4 color = texture2D(u_image, v_uv);
  vec3 rgb = color.a > 0.0 ? color.rgb / color.a : vec3(0.0);
  float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
  float soften = max(u_soften, 0.0);
  float key = soften > 0.0 ? smoothstep(u_threshold - soften, u_threshold + soften, luma) : step(u_threshold, luma);
  if (u_invert != 0) key = 1.0 - key;
  gl_FragColor = u_mask != 0 ? vec4(vec3(key), 1.0) * color.a : color * key;
}
