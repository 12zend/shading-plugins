// Panzoid's built-in "Brightness + Contrast" effect, used inside the AfterClip group presets: adds the
// brightness and scales the colors around middle gray by the contrast (1 = unchanged), on straight colors.
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform float u_brightness;
uniform float u_contrast;

void main() {
  vec4 color = texture2D(u_image, v_uv);
  if (color.a <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec3 rgb = color.rgb / color.a;
  rgb = clamp((rgb + u_brightness - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  gl_FragColor = vec4(rgb * color.a, color.a);
}
