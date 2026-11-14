// Panzoid's built-in "Duplicate" effect, used inside the AfterClip group presets. Its source is part of Panzoid,
// not Zoidium, so this pass reproduces it from the preset values and AfterClip's "Duplicate (Extended)":
// scale the image around the center by the multiplier, rotate it (radians, aspect-correct), shift it by the
// offset (in image widths/heights) and tile it. repeat 1 repeats the tiles; repeat 0 mirrors every other tile.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform vec2 u_offset;
uniform vec2 u_multiplier;
uniform float u_rotation;
uniform int u_repeat;

void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = (v_uv - 0.5) * u_multiplier;
  p.x *= aspect;
  float c = cos(u_rotation);
  float s = sin(u_rotation);
  p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
  p.x /= aspect;
  vec2 uv = p + 0.5 - u_offset;
  if (u_repeat == 1) {
    uv = fract(uv);
  } else {
    vec2 m = mod(uv, 2.0);
    uv = 1.0 - abs(m - 1.0);
  }
  gl_FragColor = texture2D(u_image, uv);
}
