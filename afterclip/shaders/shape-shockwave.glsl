// Ported from Zoidium plugins/afterclip/shaders/afterclip-shape-shockwave.glsl (Shockwave).
// Shader by AfterClip; Zoidium normalization by rbstxt (1zworks). MIT, see ../ZOIDIUM-LICENSE.md.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_mix;

uniform float u_Opacity;
uniform vec2 u_Scale;
uniform float u_Rotation;
uniform vec3 u_Color;
uniform int u_N;
uniform float u_InSize;
uniform float u_OutSize;
uniform vec2 u_Position;
uniform float u_PatternRotation;

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

vec2 objectUv;

vec2 standardObjectUv(vec2 uv) {
    vec2 p = uv * 2.0 - 1.0;
    p -= u_Position;
    p.x *= 16.0 / 9.0;
    
    float standardRotation = u_Rotation * 3.14159265359 / 180.0;
    p = vec2(
        cos(standardRotation) * p.x + sin(standardRotation) * p.y,
        -sin(standardRotation) * p.x + cos(standardRotation) * p.y
    );
    p /= max(abs(u_Scale), vec2(0.0001));
    p.x /= 16.0 / 9.0;
    return p * 0.5 + 0.5;
}

float polygonDistance(vec2 point, int sides, float radius) {
    float angle = (u_PatternRotation * 3.14159265359 / 180.0) + atan(point.y, point.x) + 3.14159265359 / float(sides);
    float segmentAngle = 2.0 * 3.14159265359 / float(sides);
    float distanceToEdge = radius * cos(segmentAngle / 2.0) / cos(mod(angle, segmentAngle) - segmentAngle / 2.0);
    return length(point) - distanceToEdge;
}

void zoidiumMain() {
objectUv = standardObjectUv(v_uv);
vec4 sourceTexel = texture2D(u_image, v_uv);
if (u_Opacity <= 0.0) { gl_FragColor = premultiplyColor(sourceTexel); return; }
    vec2 uv = objectUv;

    vec2 adjustedUV = uv - vec2(0.5);
    adjustedUV.x *= 16.0 / 9.0;
    float distOuter = polygonDistance(adjustedUV, u_N, u_OutSize);
    float distInner = polygonDistance(adjustedUV, u_N, u_InSize);

    if (distOuter < 0.0 && distInner > 0.0) {
        gl_FragColor = sourceOverColor(sourceTexel, u_Color, u_Opacity);
    } else {
        gl_FragColor = premultiplyColor(sourceTexel);
    }
}


void main() {
  vec4 zoidiumSource = texture2D(u_image, v_uv);
  zoidiumMain();
  gl_FragColor = mix(zoidiumSource, gl_FragColor, clamp(u_mix, 0.0, 1.0));
}
