// Panzoid's built-in shape "Mask" effect, used inside the AfterClip group presets. Its source is part of
// Panzoid, so this pass reproduces it from the preset values: a rectangle (mode 0) or ellipse (mode 1) at
// `position` with `size`, both in pixels of a 1080-pixel-high project (scaled to the stage height), rotated by
// `rotation` degrees. `feather` (0-1) softens that fraction of the shape towards its edge, `invert` keeps the
// outside instead, and `opacity` sets how strongly the mask applies.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform int u_mode;
uniform vec2 u_position;
uniform vec2 u_size;
uniform float u_rotation;
uniform int u_invert;
uniform float u_feather;
uniform float u_opacity;

const float PROJECT_HEIGHT = 1080.0;

void main() {
  vec4 color = texture2D(u_image, v_uv);
  float toProject = PROJECT_HEIGHT / max(u_resolution.y, 1.0);
  vec2 p = (v_uv - 0.5) * u_resolution * toProject - u_position;
  float angle = radians(u_rotation);
  float c = cos(angle);
  float s = sin(angle);
  p = vec2(p.x * c + p.y * s, -p.x * s + p.y * c);
  vec2 halfSize = max(abs(u_size) * 0.5, vec2(0.0001));
  vec2 q = p / halfSize;
  float d = u_mode == 1 ? length(q) : max(abs(q.x), abs(q.y));
  float feather = clamp(u_feather, 0.0, 1.0);
  float inside = feather > 0.0 ? 1.0 - smoothstep(1.0 - feather, 1.0, d) : step(d, 1.0);
  if (u_invert != 0) inside = 1.0 - inside;
  gl_FragColor = color * mix(1.0, inside, clamp(u_opacity, 0.0, 1.0));
}
