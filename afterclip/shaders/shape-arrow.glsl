// Ported from Zoidium plugins/afterclip/shaders/afterclip-shape-arrow.glsl (Arrow Shape).
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
uniform float u_Radius;
uniform float u_Radius2;
uniform float u_Angle;
uniform float u_PatternRotation;
uniform float u_OutSize;
uniform float u_InSize;
uniform vec2 u_Position;
uniform vec3 u_Color;

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

bool isInTriangle(vec2 p, vec2 p0, vec2 p1, vec2 p2) {
    vec2 v0 = p2 - p0;
    vec2 v1 = p1 - p0;
    vec2 v2 = p - p0;
    
    float d00 = dot(v0, v0);
    float d01 = dot(v0, v1);
    float d11 = dot(v1, v1);
    float d20 = dot(v2, v0);
    float d21 = dot(v2, v1);
    float denom = d00 * d11 - d01 * d01;
    float v = (d11 * d20 - d01 * d21) / denom;
    float w = (d00 * d21 - d01 * d20) / denom;
    float u = 1.0 - v - w;
    
    return (u >= 0.0) && (v >= 0.0) && (w >= 0.0);
}

bool isInQuad(vec2 p, vec2 p0, vec2 p1, vec2 p2, vec2 p3) {
    
    return isInTriangle(p, p0, p1, p2) || isInTriangle(p, p0, p2, p3);
}

void zoidiumMain()
{
objectUv = standardObjectUv(v_uv);
vec4 sourceTexel = texture2D(u_image, v_uv);
if (u_Opacity <= 0.0) { gl_FragColor = premultiplyColor(sourceTexel); return; }
    
    
    vec2 P1 = vec2(0.5, 0.5);
    
    
    float angleRad = u_Angle * 3.14159265359 / 180.0;
    float rotationRad = u_PatternRotation * 3.14159265359 / 180.0;
    
    
    float radiusPixels = u_Radius * 100.0;
    float radius2Pixels = u_Radius2 * 100.0;
    
    
    
    
    
    float normRadius = radiusPixels / 1920.0 * u_OutSize;
    vec2 P2_out = P1 + vec2(
        normRadius * cos(rotationRad + angleRad / 2.0),
        normRadius * sin(rotationRad + angleRad / 2.0) * (16.0 / 9.0)
    );
    
    
    
    vec2 P3_out = P1 + vec2(
        normRadius * cos(rotationRad - angleRad / 2.0),
        normRadius * sin(rotationRad - angleRad / 2.0) * (16.0 / 9.0)
    );
    
    
    
    float normRadius2 = radius2Pixels / 1920.0 * u_OutSize;
    vec2 P4_out = P1 + vec2(
        normRadius2 * cos(rotationRad),
        normRadius2 * sin(rotationRad) * (16.0 / 9.0)
    );
    
    
    float angleRadIn = angleRad * 1.02;  
    float normRadiusIn = radiusPixels / 1920.0 * u_InSize;
    vec2 P2_in = P1 + vec2(
        normRadiusIn * cos(rotationRad + angleRadIn / 2.0),
        normRadiusIn * sin(rotationRad + angleRadIn / 2.0) * (16.0 / 9.0)
    );
    
    vec2 P3_in = P1 + vec2(
        normRadiusIn * cos(rotationRad - angleRadIn / 2.0),
        normRadiusIn * sin(rotationRad - angleRadIn / 2.0) * (16.0 / 9.0)
    );
    
    float normRadius2In = radius2Pixels / 1920.0 * u_InSize;
    vec2 P4_in = P1 + vec2(
        normRadius2In * cos(rotationRad),
        normRadius2In * sin(rotationRad) * (16.0 / 9.0)
    );
    
    
    bool inOuter = isInQuad(objectUv, P1, P2_out, P4_out, P3_out);
    bool inInner = isInQuad(objectUv, P1, P2_in, P4_in, P3_in);
    
    if (inOuter && !inInner) {
        gl_FragColor = sourceOverColor(sourceTexel, u_Color, u_Opacity);
    } else {
        vec4 texel = texture2D(u_image, v_uv);
        gl_FragColor = premultiplyColor(texel);
    }
}


void main() {
  vec4 zoidiumSource = texture2D(u_image, v_uv);
  zoidiumMain();
  gl_FragColor = mix(zoidiumSource, gl_FragColor, clamp(u_mix, 0.0, 1.0));
}
