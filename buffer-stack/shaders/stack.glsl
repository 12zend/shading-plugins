precision highp float;
varying vec2 v_uv;
uniform sampler2D u_accum;
uniform sampler2D u_sample;
uniform int u_mode;
uniform int u_first;
uniform float u_accumWeight;
uniform float u_sampleWeight;

vec3 straightColor(vec4 p) {
  return p.a > 0.00001 ? p.rgb / p.a : vec3(0.0);
}

void main() {
  vec4 samplePixel = texture2D(u_sample, v_uv);
  if (u_first == 1) {
    gl_FragColor = u_mode == 1 ? samplePixel * u_sampleWeight : samplePixel;
    return;
  }
  vec4 accumPixel = texture2D(u_accum, v_uv);
  if (u_mode == 0) {
    float totalWeight = max(u_accumWeight + u_sampleWeight, 0.00001);
    gl_FragColor = (accumPixel * u_accumWeight + samplePixel * u_sampleWeight) / totalWeight;
  } else if (u_mode == 1) {
    gl_FragColor = accumPixel + samplePixel * u_sampleWeight;
  } else {
    float accumLuminance = dot(straightColor(accumPixel), vec3(0.2126, 0.7152, 0.0722));
    float sampleLuminance = dot(straightColor(samplePixel), vec3(0.2126, 0.7152, 0.0722));
    bool useSample = u_mode == 2 ? sampleLuminance > accumLuminance : sampleLuminance < accumLuminance;
    gl_FragColor = useSample ? samplePixel : accumPixel;
  }
}
