// Ported from Zoidium plugins/afterclip/shaders/groups/afterclip-group-effects-fw-line.glsl (Line), as one pass of a group preset.
// Shader by AfterClip; Zoidium normalization by rbstxt (1zworks). MIT, see ../../ZOIDIUM-LICENSE.md.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;

uniform float u_Opacity;
uniform vec2 u_Scale;
uniform float u_Rotation;
uniform vec2 u_Position;
uniform vec2 u_P1;
uniform vec2 u_P2;
uniform float u_Width;
uniform vec3 u_Color;
uniform int u_Stroke;
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

const float ASPECT = 9.0 / 16.0;
const float DEG2RAD = 3.14159265359 / 180.0;

vec2 rotate(vec2 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

void main() {
objectUv = standardObjectUv(v_uv);
vec4 sourceTexel = texture2D(u_image, v_uv);
if (u_Opacity <= 0.0) { gl_FragColor = premultiplyColor(sourceTexel); return; }
    vec4 texel = texture2D(u_image, v_uv);

    vec2 p1 = vec2(u_P1.x / 1920.0, u_P1.y / 1080.0);
    vec2 p2 = vec2(u_P2.x / 1920.0, u_P2.y / 1080.0);
    vec2 uv = objectUv - 0.5;

    vec2 p1Corrected = vec2(p1.x, p1.y * ASPECT);
    vec2 p2Corrected = vec2(p2.x, p2.y * ASPECT);
    vec2 uvCorrected = vec2(uv.x, uv.y * ASPECT);

    float rad = u_PatternRotation * DEG2RAD;
    p1Corrected = rotate(p1Corrected, rad);
    p2Corrected = rotate(p2Corrected, rad);

    vec2 dir = p2Corrected - p1Corrected;
    float len = length(dir);
    vec2 dirNorm = normalize(dir);

    vec2 toPoint = uvCorrected - p1Corrected;

    float projDist = dot(toPoint, dirNorm);
    
    vec2 projPoint = p1Corrected + projDist * dirNorm;
    float perpDist = length(uvCorrected - projPoint);

    float w = u_Width / 100.0;

    bool draw = false;

    if (u_Stroke == 0) {
        if (projDist >= 0.0 && projDist <= len && perpDist < w) {
            draw = true;
        }
    } else if (u_Stroke == 1) {
        float tClamped = clamp(projDist / len, 0.0, 1.0);
        vec2 closestPoint = p1Corrected + tClamped * dir;
        float dist = length(uvCorrected - closestPoint);
        if (dist < w) {
            draw = true;
        }
    } else if (u_Stroke == 2) {
        if (projDist >= -w && projDist <= len + w && perpDist < w) {
            draw = true;
        }
    }

    if (draw) {
        gl_FragColor = sourceOverColor(sourceTexel, u_Color, u_Opacity);
    } else {
        gl_FragColor = premultiplyColor(texel);
    }
}
