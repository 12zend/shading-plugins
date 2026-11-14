// Ported from Zoidium plugins/afterclip/shaders/afterclip-shape-hex-net.glsl (Hex Net).
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
uniform float u_GridSize;
uniform float u_HexScale;
uniform vec3 u_Color;
uniform vec2 u_Offset;
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

const float SQRT3 = 1.732050808;
const float DEG_TO_RAD = 3.14159265359 / 180.0;

mat2 rotate2D(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

vec4 getHexCell(vec2 p) {
    vec2 s = vec2(1.0, SQRT3);
    vec2 h = s * 0.5;
    
    vec2 a = mod(p, s) - h;
    vec2 b = mod(p - h, s) - h;
    
    vec2 gv = length(a) < length(b) ? a : b;
    vec2 id = p - gv;
    
    return vec4(gv, id);
}

float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, vec2(0.5, SQRT3 * 0.5)), p.x);
}

void zoidiumMain() {
objectUv = standardObjectUv(v_uv);
vec4 sourceTexel = texture2D(u_image, v_uv);
if (u_Opacity <= 0.0) { gl_FragColor = premultiplyColor(sourceTexel); return; }
    vec4 originalTexel = texture2D(u_image, v_uv);
    
    float aspectRatio = 16.0 / 9.0;
    
    vec2 uv = objectUv - vec2(0.5);
    uv.x *= aspectRatio;
    
    vec2 offsetUV = uv + u_Offset;
    
    float angleRad = u_PatternRotation * DEG_TO_RAD;
    mat2 rotMat = rotate2D(angleRad);
    vec2 rotatedUV = rotMat * offsetUV;
    
    vec2 hexUV = rotatedUV * u_GridSize;
    
    vec4 hex = getHexCell(hexUV);
    vec2 gv = hex.xy;
    vec2 id = hex.zw;
    
    vec2 samplePos = id;
    samplePos /= u_GridSize;
    
    mat2 invRotMat = rotate2D(-angleRad);
    samplePos = invRotMat * samplePos;
    
    samplePos -= u_Offset;
    samplePos.x /= aspectRatio;
    
    vec2 sampleUV = samplePos + vec2(0.5);
    sampleUV = clamp(sampleUV, 0.0, 1.0);
    
    vec4 texColor = texture2D(u_image, sampleUV);
    
    float maxRadius = 0.5;
    float currentRadius = maxRadius * u_HexScale;
    
    if (hexDist(gv) > currentRadius) {
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
