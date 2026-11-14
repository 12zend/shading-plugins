// Ported from Zoidium plugins/afterclip/shaders/afterclip-repeat-dot-wave.glsl (Dot Wave).
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
uniform float u_BoxScaleMin;
uniform float u_BoxScaleMax;
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

void zoidiumMain()
{
objectUv = standardObjectUv(v_uv);
vec4 sourceTexel = texture2D(u_image, v_uv);
if (u_Opacity <= 0.0) { gl_FragColor = premultiplyColor(sourceTexel); return; }
    vec2 vUvScaled2 = vec2(objectUv.x * (16.0 / 9.0), objectUv.y);

    vec2 cellUV = vUvScaled2 * u_GridSize;
    vec2 cellCoord = floor(cellUV);
    vec2 cellFract = fract(cellUV);

    vec2 cellCenterUV = (cellCoord + 0.5) / u_GridSize;
    vec2 originalUV = vec2(cellCenterUV.x / (16.0 / 9.0), cellCenterUV.y);

    vec3 centerColor = texture2D(u_image, originalUV).rgb;

    float value = max(max(centerColor.r, centerColor.g), centerColor.b);

    float dynamicBoxScale = mix(u_BoxScaleMin, u_BoxScaleMax, value);

    vec2 centerStart = vec2(0.5) - dynamicBoxScale / 2.0;
    vec2 centerEnd   = vec2(0.5) + dynamicBoxScale / 2.0;

    bool inBox = all(greaterThanEqual(cellFract, centerStart)) &&
                 all(lessThanEqual(cellFract, centerEnd));

    if (inBox) {
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
