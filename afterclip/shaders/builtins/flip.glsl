// Panzoid's built-in "Flip" effect, used inside the AfterClip group presets: mirrors the image horizontally
// and/or vertically.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform int u_horizontal;
uniform int u_vertical;

void main() {
  vec2 uv = v_uv;
  if (u_horizontal != 0) uv.x = 1.0 - uv.x;
  if (u_vertical != 0) uv.y = 1.0 - uv.y;
  gl_FragColor = texture2D(u_image, uv);
}
