// Ported from Zoidium plugins/afterclip/shaders/afterclip-warp-stretch.glsl (Stretch).
// Shader by AfterClip; Zoidium normalization by rbstxt (1zworks). MIT, see ../ZOIDIUM-LICENSE.md.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_mix;

uniform float u_Angle;
uniform float u_Stretch;

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



void zoidiumMain()
{
vec4 sourceTexel = texture2D(u_image, v_uv);
    
    const float DEG_TO_RAD = 3.14159265359 / 180.0;
    float angleRad = u_Angle * DEG_TO_RAD;

    
    vec2 localUv = v_uv - vec2(0.5);

    
    float c = cos(-angleRad); 
    float s = sin(-angleRad);
    
    vec2 rotatedUv;
    rotatedUv.x = localUv.x * c - localUv.y * s;
    rotatedUv.y = localUv.x * s + localUv.y * c;

    
    
    
    vec2 stretchedUv;
    stretchedUv.x = rotatedUv.x / u_Stretch; 
    stretchedUv.y = rotatedUv.y;           

    
    c = cos(angleRad); 
    s = sin(angleRad);
    
    vec2 reRotatedUv;
    reRotatedUv.x = stretchedUv.x * c - stretchedUv.y * s;
    reRotatedUv.y = stretchedUv.x * s + stretchedUv.y * c;

    
    vec2 finalUv = reRotatedUv + vec2(0.5);

    
    
    
    
    vec4 texel = texture2D(u_image, finalUv);
    
    gl_FragColor = premultiplyColor(texel);
}


void main() {
  vec4 zoidiumSource = texture2D(u_image, v_uv);
  zoidiumMain();
  gl_FragColor = mix(zoidiumSource, gl_FragColor, clamp(u_mix, 0.0, 1.0));
}
