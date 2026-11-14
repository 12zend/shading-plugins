// Ported from Zoidium plugins/afterclip/shaders/afterclip-shape-roundedstar.glsl (RoundedStar).
// Shader by AfterClip; Zoidium normalization by rbstxt (1zworks). MIT, see ../ZOIDIUM-LICENSE.md.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_mix;

uniform vec2 u_Scale;
uniform float u_Rotation;
uniform vec3 u_Color;
uniform float u_Opacity;
uniform float u_Size;
uniform vec2 u_Position;
uniform vec2 u_EllipseScale;
uniform float u_PatternRotation;
uniform int u_N;

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

#define PI 3.14159265359

vec4 blendColors(vec4 baseColor, vec4 overlayColor) {
    float sourceAlpha = clamp(overlayColor.a, 0.0, 1.0);
    float backgroundAlpha = clamp(baseColor.a, 0.0, 1.0);
    float remainingBackground = backgroundAlpha * (1.0 - sourceAlpha);
    float outputAlpha = sourceAlpha + remainingBackground;
    vec3 outputColor = overlayColor.rgb * sourceAlpha + baseColor.rgb * (1.0 - sourceAlpha);
    return vec4(outputColor, outputAlpha);
}

vec2 rotate(vec2 p, float angleRad) {
    float s = sin(angleRad);
    float c = cos(angleRad);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

void zoidiumMain() {
objectUv = standardObjectUv(v_uv);
vec4 sourceTexel = texture2D(u_image, v_uv);
if (u_Opacity <= 0.0) { gl_FragColor = premultiplyColor(sourceTexel); return; }
    vec2 uv = objectUv;
    vec4 texel = premultiplyColor(sourceTexel);
    vec2 adjustedUV = uv - vec2(0.5);
    adjustedUV.x *= 16.0 / 9.0;
    vec2 centerOffset = vec2(0.0);
    vec2 currentPos = adjustedUV - centerOffset;
    vec4 finalColor = texel;
    
    if (u_N <= 0) {
        gl_FragColor = finalColor;
        return;
    }
    
    for (int i = 0; i < 100; ++i) {
        if (i >= u_N) break;
        float uniformRotationAngle = 2.0 * PI / float(u_N) * float(i);
        float additionalRotationRad = u_PatternRotation * PI / 180.0;
        float totalRotationRad = uniformRotationAngle + additionalRotationRad;
        vec2 rotatedPos = rotate(currentPos, -totalRotationRad);
        
        if (rotatedPos.x < 0.0) {
            float effectiveSize = u_Size * 0.5;
            vec2 d = rotatedPos / (effectiveSize * u_EllipseScale);
            float dist = dot(d, d);
            if (dist < 1.0) {
                vec4 shapeColor = vec4(u_Color, u_Opacity);
                finalColor = blendColors(finalColor, shapeColor);
            }
        }
    }
    
    gl_FragColor = finalColor;
}


void main() {
  vec4 zoidiumSource = texture2D(u_image, v_uv);
  zoidiumMain();
  gl_FragColor = mix(zoidiumSource, gl_FragColor, clamp(u_mix, 0.0, 1.0));
}
