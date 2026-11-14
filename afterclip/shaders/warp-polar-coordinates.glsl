// Ported from Zoidium plugins/afterclip/shaders/afterclip-warp-polar-coordinates.glsl (Polar Coordinates).
// Shader by AfterClip; Zoidium normalization by rbstxt (1zworks). MIT, see ../ZOIDIUM-LICENSE.md.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_mix;



vec4 premultiplyColor(vec4 colorValue) {
    float alpha = clamp(colorValue.a, 0.0, 1.0);
    return vec4(colorValue.rgb * alpha, alpha);
}

vec4 sourceOverColor(vec4 backgroundColor, vec3 effectColor, float effectAlpha) {
    float sourceAlpha = clamp(effectAlpha, 0.0, 1.0);
    float backgroundAlpha = clamp(backgroundColor.a, 0.0, 1.0);
    float remainingBackground = backgroundAlpha * (1.0 - sourceAlpha);
    float outputAlpha = sourceAlpha + remainingBackground;
    vec3 outputColor = effectColor * sourceAlpha + backgroundColor.rgb * remainingBackground;
    return vec4(outputColor, outputAlpha);
}



void zoidiumMain()
{
vec4 sourceTexel = texture2D(u_image, v_uv);
    vec2 centeredUv = v_uv - vec2(0.5);

    centeredUv.x /= 9.0 / 16.0;

    float r = length(centeredUv);
    float theta = atan(centeredUv.y, centeredUv.x);

    theta = theta / (2.0 * 3.14159265) + 0.5;

    vec2 polarUv = vec2(theta, r);

    vec4 texel = texture2D(u_image, polarUv);

    gl_FragColor = premultiplyColor(texel);
}


void main() {
  vec4 zoidiumSource = texture2D(u_image, v_uv);
  zoidiumMain();
  gl_FragColor = mix(zoidiumSource, gl_FragColor, clamp(u_mix, 0.0, 1.0));
}
