// Ported from Zoidium plugins/afterclip/shaders/afterclip-shape-lines.glsl (Lines).
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
uniform float u_PaintedWidth;
uniform float u_UnpaintedWidth;
uniform float u_Angle;
uniform float u_Offset;
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

void zoidiumMain() {
objectUv = standardObjectUv(v_uv);
vec4 sourceTexel = texture2D(u_image, v_uv);
if (u_Opacity <= 0.0) { gl_FragColor = premultiplyColor(sourceTexel); return; }
    vec4 texel = texture2D(u_image, v_uv);
    
    
    float angle_rad = ( u_Angle - 45.0 ) * 3.14159265359 / 180.0;
    float cosAngle = cos(angle_rad);
    float sinAngle = sin(angle_rad);
    
    
    vec2 p = objectUv - vec2(0.5);
    p.y *= 9.0 / 16.0;  
    
    vec2 rotatedP = vec2(
        p.x * cosAngle - p.y * sinAngle,
        p.x * sinAngle + p.y * cosAngle
    );
    
    
    float painted = u_PaintedWidth / 100.0;
    float unpainted = u_UnpaintedWidth / 100.0;
    
    float pattern_width = painted + unpainted;
    float sRotated = rotatedP.x + rotatedP.y + u_Offset;
    float blinds = mod(sRotated, pattern_width);
    
    
    float half_unpainted = unpainted / 2.0;
    float alpha = step(half_unpainted, blinds) * step(blinds, pattern_width - half_unpainted);
    
    
    vec4 blindsColor = vec4(u_Color, 1.0) * alpha;
    gl_FragColor = sourceOverColor(sourceTexel, u_Color, alpha * u_Opacity);
}


void main() {
  vec4 zoidiumSource = texture2D(u_image, v_uv);
  zoidiumMain();
  gl_FragColor = mix(zoidiumSource, gl_FragColor, clamp(u_mix, 0.0, 1.0));
}
