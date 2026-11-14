// Ported from Zoidium plugins/afterclip/shaders/afterclip-warp-wavy-extended.glsl (Wavy (Extended)).
// Shader by AfterClip; Zoidium normalization by rbstxt (1zworks). MIT, see ../ZOIDIUM-LICENSE.md.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_mix;

uniform float u_Time;
uniform float u_Amount;
uniform float u_Size;
uniform float u_Angle;
uniform float u_WarpAngle;
uniform int u_Repeat;

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



#define PI 3.14159265359

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
    vec2 uv = v_uv;
    
    vec2 warp_vector = vec2(cos(u_WarpAngle), sin(u_WarpAngle));
    
    vec2 centered_uv = uv - vec2(0.5);
    vec2 propagation_vector = vec2(cos(u_Angle), sin(u_Angle));
    float phase_offset = dot(centered_uv, propagation_vector);

    float wave_value = sin(phase_offset * u_Size + u_Time);
    
    vec2 offset = warp_vector * wave_value * u_Amount * 0.01;
    vec2 distorted_uv = uv + offset;
    
    if (u_Repeat == 3) {
        if (distorted_uv.x < 0.0 || distorted_uv.x > 1.0 ||
            distorted_uv.y < 0.0 || distorted_uv.y > 1.0) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }
    }
    
    vec2 wrapped_uv = wrap(distorted_uv, u_Repeat);
    
    vec4 texColor = texture2D(u_image, wrapped_uv);
    gl_FragColor = premultiplyColor(texColor);
}


void main() {
  vec4 zoidiumSource = texture2D(u_image, v_uv);
  zoidiumMain();
  gl_FragColor = mix(zoidiumSource, gl_FragColor, clamp(u_mix, 0.0, 1.0));
}
