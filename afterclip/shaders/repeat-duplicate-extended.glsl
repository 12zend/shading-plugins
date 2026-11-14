// Ported from Zoidium plugins/afterclip/shaders/afterclip-repeat-duplicate-extended.glsl (Duplicate (Extended)).
// Shader by AfterClip; Zoidium normalization by rbstxt (1zworks). MIT, see ../ZOIDIUM-LICENSE.md.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_mix;

uniform vec2 u_Offset;
uniform int u_RepeatMode;
uniform float u_Rotation;
uniform vec2 u_Multiplier;
uniform vec2 u_Anchor;

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



vec2 wrap(vec2 uv, int mode) {
    if (mode == 0) {
        return clamp(uv, 0.0, 1.0);
    } else if (mode == 1) {
        return mod(uv, 1.0); 
    } else if (mode == 2) {
        vec2 m = mod(uv, 2.0);
        return 1.0 - abs(m - 1.0);
    } else {
        return uv;
    }
}

void zoidiumMain()
{
vec4 sourceTexel = texture2D(u_image, v_uv);
    const float ASPECT_RATIO = 16.0 / 9.0;
    const float DEG_TO_RAD = 3.14159265359 / 180.0;
    
    float rotationRad = u_Rotation * DEG_TO_RAD;
    
    vec2 anchorPoint = vec2(0.5) + u_Anchor;
    
    vec2 localUv = v_uv - anchorPoint; 

    vec2 scaledUv = localUv * u_Multiplier; 

    vec2 adjustedUv = scaledUv;
    adjustedUv.x *= ASPECT_RATIO;

    float c = cos(rotationRad);
    float s = sin(rotationRad);
    
    vec2 rotatedUv;
    rotatedUv.x = adjustedUv.x * c - adjustedUv.y * s;
    rotatedUv.y = adjustedUv.x * s + adjustedUv.y * c;

    vec2 finalRotatedUv = rotatedUv;
    finalRotatedUv.x /= ASPECT_RATIO;

    vec2 shiftedUv = finalRotatedUv + anchorPoint - u_Offset;

    if (u_RepeatMode == 3) {
        if (shiftedUv.x < 0.0 || shiftedUv.x > 1.0 || 
            shiftedUv.y < 0.0 || shiftedUv.y > 1.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); 
            return;
        }
    }

    vec2 wrappedUv = wrap(shiftedUv, u_RepeatMode);
    
    vec4 texel = texture2D(u_image, wrappedUv);
    
    if (u_RepeatMode != 3) {
        gl_FragColor = premultiplyColor(texel);
    }
}


void main() {
  vec4 zoidiumSource = texture2D(u_image, v_uv);
  // The original leaves gl_FragColor unwritten inside the frame in repeat mode 3;
  // start from transparent so that case is defined instead of reading garbage.
  gl_FragColor = vec4(0.0);
  zoidiumMain();
  gl_FragColor = mix(zoidiumSource, gl_FragColor, clamp(u_mix, 0.0, 1.0));
}
