// Final pass of the AfterClip group presets: mixes the chain's result with the block's input.
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;   // input
uniform sampler2D u_effect;  // result of the chain
uniform float u_mix;
void main() {
  gl_FragColor = mix(texture2D(u_image, v_uv), texture2D(u_effect, v_uv), clamp(u_mix, 0.0, 1.0));
}
