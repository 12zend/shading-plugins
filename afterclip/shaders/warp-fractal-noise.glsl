// Ported from Zoidium plugins/afterclip/shaders/afterclip-warp-fractal-noise.glsl (Fractal Noise).
// Shader by AfterClip; Zoidium normalization by rbstxt (1zworks). MIT, see ../ZOIDIUM-LICENSE.md.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_mix;

uniform vec2 u_NoisePosition;
uniform vec2 u_NoiseScale;
uniform int u_Step;
uniform float u_Evolution;
uniform float u_Complexity;
uniform float u_Strength;
uniform float u_Angle;
uniform float u_AngleNoise;
uniform vec3 u_StartColor;
uniform vec3 u_EndColor;

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



float rand(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);

    float a = rand(i);
    float b = rand(i + vec3(1.0, 0.0, 0.0));
    float c = rand(i + vec3(0.0, 1.0, 0.0));
    float d = rand(i + vec3(1.0, 1.0, 0.0));
    float e = rand(i + vec3(0.0, 0.0, 1.0));
    float f1 = rand(i + vec3(1.0, 0.0, 1.0));
    float g = rand(i + vec3(0.0, 1.0, 1.0));
    float h = rand(i + vec3(1.0, 1.0, 1.0));

    vec3 u = f * f * (3.0 - 2.0 * f);

    float x1 = mix(a, b, u.x);
    float x2 = mix(c, d, u.x);
    float x3 = mix(e, f1, u.x);
    float x4 = mix(g, h, u.x);

    float y1 = mix(x1, x2, u.y);
    float y2 = mix(x3, x4, u.y);

    return mix(y1, y2, u.z);
}

float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 2.0;
    float totalAmplitude = 0.0;

    int octaves = int(u_Complexity);
    if (octaves < 1) octaves = 1;
    if (octaves > 10) octaves = 10;

    for (int i = 0; i < 10; i++) {
        if (i >= octaves) break;
        value += amplitude * noise(p);
        totalAmplitude += amplitude;
        p *= frequency;
        amplitude *= 0.5;
    }
    return value / totalAmplitude;
}

vec2 warpDomain(vec2 uv) {
    
    float n = noise(vec3(uv + u_NoisePosition, u_Evolution));

    
    float angle;
    if (u_AngleNoise == 0.0) {
        angle = u_Angle; 
    } else if (u_AngleNoise == 1.0) {
        angle = n * 3.14159 * 2.0;  
    } else {
        
        angle = mix(u_Angle, n * 3.14159 * 2.0, u_AngleNoise);
    }

    
    vec2 warpDirection = vec2(cos(angle), sin(angle)); 
    vec2 warpedUv = uv + u_Strength * warpDirection; 

    return warpedUv;
}

vec3 getColor(float value) {
    value = clamp(value, 0.0, 1.0);

    if (u_Step == 0) {
        
        return mix(u_StartColor, u_EndColor, value);
    } else {
        
        float stepValue = floor(value * float(u_Step)) / float(u_Step);  
        return mix(u_StartColor, u_EndColor, stepValue);
    }
}

void zoidiumMain() {
vec4 sourceTexel = texture2D(u_image, v_uv);
    
    vec2 uv = v_uv;
    uv = (uv - 0.5) * vec2(16.0/9.0, 1.0) + 0.5;
    uv = (uv - 0.5) * u_NoiseScale + 0.5;

    
    vec2 warpedUv = warpDomain(uv);

    
    vec3 pos = vec3(warpedUv + u_NoisePosition, u_Evolution);

    
    float n = fbm(pos);

    
    vec3 color = getColor(n);

    gl_FragColor = sourceOverColor(sourceTexel, color, 1.0);
}


void main() {
  vec4 zoidiumSource = texture2D(u_image, v_uv);
  zoidiumMain();
  gl_FragColor = mix(zoidiumSource, gl_FragColor, clamp(u_mix, 0.0, 1.0));
}
