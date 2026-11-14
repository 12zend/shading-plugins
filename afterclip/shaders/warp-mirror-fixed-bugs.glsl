// Ported from Zoidium plugins/afterclip/shaders/afterclip-warp-mirror-fixed-bugs.glsl (Mirror (Fixed)).
// Shader by AfterClip; Zoidium normalization by rbstxt (1zworks). MIT, see ../ZOIDIUM-LICENSE.md.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_mix;

uniform float u_Segments;

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



const float pi = 3.14159265358979323846264;
const float two_pi = 2.0 * pi;

const float aspect = 16.0 / 9.0;

void zoidiumMain() {
vec4 sourceTexel = texture2D(u_image, v_uv);
    vec2 p = v_uv - 0.5;
    
    p.x *= aspect;

    float angle = atan(p.y, p.x);
    float radius = length(p);
    float segmentAngle = two_pi / u_Segments;
    float adjustedAngle = angle + pi;
    float segmentId = floor(adjustedAngle / segmentAngle);
    float newAngle = mod(adjustedAngle, segmentAngle) - 0.5 * segmentAngle;
    vec2 newP = vec2(cos(newAngle), sin(newAngle)) * radius;

    newP.x /= aspect;

    vec2 newUV = newP + 0.5;
    vec4 texel = texture2D(u_image, newUV);
    gl_FragColor = premultiplyColor(texel);
}


void main() {
  vec4 zoidiumSource = texture2D(u_image, v_uv);
  zoidiumMain();
  gl_FragColor = mix(zoidiumSource, gl_FragColor, clamp(u_mix, 0.0, 1.0));
}
