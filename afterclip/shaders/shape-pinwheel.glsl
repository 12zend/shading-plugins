// Ported from Zoidium plugins/afterclip/shaders/afterclip-shape-pinwheel.glsl (PinWheel).
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
uniform vec2 u_Position;
uniform float u_Radius;
uniform vec3 u_Color;
uniform float u_PatternRotation;
uniform float u_Dir;
uniform float u_Wide;
uniform float u_Repeat;
uniform float u_Wavy;
uniform float u_Frequency;

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
const float PI = 3.14159265359;

void zoidiumMain() {
objectUv = standardObjectUv(v_uv);
vec4 sourceTexel = texture2D(u_image, v_uv);
if (u_Opacity <= 0.0) { gl_FragColor = premultiplyColor(sourceTexel); return; }
    vec4 texel = texture2D(u_image, v_uv);

    vec2 uv = objectUv - 0.5;
    vec2 center = vec2(0.0);

    vec2 centerCorrected = vec2(center.x, center.y * ASPECT);
    vec2 uvCorrected = vec2(uv.x, uv.y * ASPECT);

    float radius = u_Radius / 100.0;

    vec2 toPixel = uvCorrected - centerCorrected;
    float dist = length(toPixel);
    float pixelAngle = atan(toPixel.y, toPixel.x);

    bool draw = false;

    for (float i = 0.0; i < 100.0; i += 1.0) {
        if (i >= u_Repeat) break;

        float rotRad = (u_PatternRotation + i * u_Wide) * DEG2RAD;
        float relativeAngle = pixelAngle - rotRad;

        
        relativeAngle = mod(relativeAngle, 2.0 * PI);
        if (relativeAngle < 0.0) {
            relativeAngle += 2.0 * PI;
        }

        float angleDeg = relativeAngle / DEG2RAD;

        
        float waveOffset = 0.0;
        if (u_Wavy > 0.0) {
            waveOffset = sin(dist * u_Frequency * 50.0) * u_Wavy;
        }

        float minAngle = 0.0 - waveOffset;
        float maxAngle = u_Dir + waveOffset;

        if (dist <= radius && angleDeg >= minAngle && angleDeg <= maxAngle) {
            draw = true;
            break;
        }

        
        if (dist <= radius && minAngle < 0.0 && angleDeg >= (360.0 + minAngle)) {
            draw = true;
            break;
        }
    }

    gl_FragColor = draw ? sourceOverColor(sourceTexel, u_Color, u_Opacity) : premultiplyColor(texel);
}


void main() {
  vec4 zoidiumSource = texture2D(u_image, v_uv);
  zoidiumMain();
  gl_FragColor = mix(zoidiumSource, gl_FragColor, clamp(u_mix, 0.0, 1.0));
}
