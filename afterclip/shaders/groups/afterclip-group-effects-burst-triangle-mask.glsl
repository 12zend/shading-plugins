// Ported from Zoidium plugins/afterclip/shaders/groups/afterclip-group-effects-burst-triangle-mask.glsl (Triangle Mask), as one pass of a group preset.
// Shader by AfterClip; Zoidium normalization by rbstxt (1zworks). MIT, see ../../ZOIDIUM-LICENSE.md.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;

uniform vec2 u_P1;
uniform vec2 u_P2;
uniform vec2 u_P3;
uniform float u_GeometryScale;

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

void main()
{
vec4 sourceTexel = texture2D(u_image, v_uv);
    vec2 p1Uv = vec2(u_P1[0]/1920.0+0.5, u_P1[1]/1080.0+0.5);
    vec2 p2Uv = vec2(u_P2[0]/1920.0+0.5, u_P2[1]/1080.0+0.5);
    vec2 p3Uv = vec2(u_P3[0]/1920.0+0.5, u_P3[1]/1080.0+0.5);
    
    vec2 centeredUV = v_uv - 0.5;
    vec2 scaledUV = centeredUV / u_GeometryScale + 0.5;
    
    if (isInTriangle(scaledUV, p1Uv, p2Uv, p3Uv)) {
        gl_FragColor = vec4(0.0);
    } else {
        vec4 texel = texture2D(u_image, v_uv);
        gl_FragColor = premultiplyColor(texel);
    }
}
