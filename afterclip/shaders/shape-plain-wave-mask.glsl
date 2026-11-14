// Ported from Zoidium plugins/afterclip/shaders/afterclip-shape-plain-wave-mask.glsl (Plain Wave Mask).
// Shader by AfterClip; Zoidium normalization by rbstxt (1zworks). MIT, see ../ZOIDIUM-LICENSE.md.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_mix;

uniform float u_Time;
uniform float u_Delay;
uniform float u_Power;
uniform float u_Step;

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



float easeInOut(float t, float p) {
    t = clamp(t, 0.0, 1.0);
    if (t < 0.5) {
        return 0.5 * pow(2.0 * t, p);
    } else {
        return 1.0 - 0.5 * pow(2.0 * (1.0 - t), p);
    }
}

float pixelateY(float y, float steps) {
    if (steps <= 0.0) {
        return y;
    }
    return floor(y * steps) / steps;
}

vec3 lerp(vec3 a, vec3 b, float t) {
    return a + (b - a) * t;
}

void zoidiumMain()
{
vec4 sourceTexel = texture2D(u_image, v_uv);
    float yUsed = pixelateY(v_uv.y, u_Step);

    float t = (u_Time*(u_Time+u_Delay)) - yUsed * u_Delay;

    float tNorm = clamp(t, 0.0, 1.0);
    float eased = easeInOut(tNorm, u_Power);

    if (v_uv.x < eased) {
        gl_FragColor = vec4(0.0);
    } else {
        gl_FragColor = premultiplyColor(texture2D(u_image, v_uv));
    }
}


void main() {
  vec4 zoidiumSource = texture2D(u_image, v_uv);
  zoidiumMain();
  gl_FragColor = mix(zoidiumSource, gl_FragColor, clamp(u_mix, 0.0, 1.0));
}
