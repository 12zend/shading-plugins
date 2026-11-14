// Panzoid's built-in "Radial Blur" effect, used inside the AfterClip group presets. Written like Zoidium's
// native-fx radial spin blur (plugins/native-fx/shaders/fx_radialblurspin.glsl), which shares its settings,
// but zooming instead of rotating: 1 + 24 samples towards and away from `center` (-1..1 of the frame), with
// `density` the zoom range, `decay` the falloff of the sample weights and `dither` a per-pixel jitter.
// `overbright` keeps Panzoid's brightening look (extra center sample, vignette and smoothstep); 0 averages.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_density;
uniform float u_dither;
uniform float u_decay;
uniform float u_weight;
uniform vec2 u_center;
uniform int u_overbright;

const int SAMPLES = 24;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.0, 289.0))) * 45758.5453);
}

void main() {
  vec2 centerOffset = 0.5 + u_center * 0.45;
  vec2 tuv = v_uv - centerOffset;
  float zoomStep = u_density * 0.2 / float(SAMPLES);
  float jitter = zoomStep * (hash(floor(v_uv * u_resolution)) * 2.0 - 1.0) * u_dither;
  tuv *= 1.0 + jitter;

  vec4 color = u_overbright != 0 ? texture2D(u_image, tuv + centerOffset) * 0.25 : vec4(0.0);
  float wt = u_weight;
  float sum = 0.0;
  color += texture2D(u_image, tuv + centerOffset) * wt;
  sum += wt;
  wt *= u_decay;
  for (int i = 1; i <= SAMPLES / 2; i++) {
    float amount = zoomStep * float(i);
    color += texture2D(u_image, tuv * (1.0 - amount) + centerOffset) * wt;
    color += texture2D(u_image, tuv * (1.0 + amount) + centerOffset) * wt;
    sum += 2.0 * wt;
    wt *= u_decay;
  }
  if (u_overbright != 0) {
    color *= 1.0 - dot(tuv, tuv) * 0.75;
    gl_FragColor = smoothstep(0.0, 1.0, color);
  } else {
    gl_FragColor = color / max(sum, 0.0001);
  }
}
