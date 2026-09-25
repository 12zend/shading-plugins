precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_radius;
uniform vec3 u_lensSamples[32];
uniform float u_rotation;
uniform float u_mix;

void main() {
  if (u_radius <= 0.001) {
    gl_FragColor = texture2D(u_image, v_uv);
    return;
  }
  vec4 original = texture2D(u_image, v_uv);
  vec4 total = original * 1.5;
  float totalWeight = 1.5;
  vec2 invResolution = vec2(1.0) / u_resolution;
  for (int i = 0; i < 32; i++) {
    vec3 sampleData = u_lensSamples[i];
    total += texture2D(u_image, v_uv + sampleData.xy * invResolution) * sampleData.z;
    totalWeight += sampleData.z;
  }
  gl_FragColor = mix(original, total * (1.0 / totalWeight), clamp(u_mix, 0.0, 1.0));
}
