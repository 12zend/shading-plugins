// Panzoid's built-in "Color Grading" effect, used inside the AfterClip group presets: multiplies the
// shadows, midtones and highlights by their colors, weighted by the pixel's luminance.
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec3 u_shadows;
uniform vec3 u_midtones;
uniform vec3 u_highlights;

void main() {
  vec4 color = texture2D(u_image, v_uv);
  if (color.a <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec3 rgb = color.rgb / color.a;
  float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
  float shadows = 1.0 - smoothstep(0.0, 0.5, luma);
  float highlights = smoothstep(0.5, 1.0, luma);
  float midtones = 1.0 - shadows - highlights;
  rgb *= u_shadows * shadows + u_midtones * midtones + u_highlights * highlights;
  gl_FragColor = vec4(clamp(rgb, 0.0, 1.0) * color.a, color.a);
}
