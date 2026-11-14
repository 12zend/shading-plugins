// Ported from Zoidium plugins/afterclip/shaders/afterclip-shape-repeating-dots.glsl (Repeating Dots).
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
uniform vec3 u_Color;
uniform vec2 u_Position;
uniform float u_Radius;
uniform float u_YInterval;
uniform float u_XInterval;
uniform int u_XRepeat;

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
  vec2 coord = (objectUv - 0.5) * 20.0;
  
  vec2 circleCenter = vec2(0.0);
  
  vec2 adjustedCoord = coord;
  adjustedCoord.x *= 16.0 / 9.0;
  
  vec2 adjustedCenter = circleCenter;
  adjustedCenter.x *= 16.0 / 9.0;
  
  
  float offsetY = mod(adjustedCoord.y - adjustedCenter.y + u_YInterval * 0.5, u_YInterval) - u_YInterval * 0.5;
  
  
  bool drawn = false;
  for (int i = 0; i < 100; i++) {
    if (i > u_XRepeat) break;
    
    float xOffset = float(i) * u_XInterval;
    float scale = 1.0 - float(i) / float(u_XRepeat + 1);
    float scaledRadius = u_Radius * scale;
    
    vec2 repeatedCenter = vec2(adjustedCenter.x + xOffset, adjustedCenter.y);
    vec2 repeatedCoord = vec2(adjustedCoord.x, repeatedCenter.y + offsetY);
    
    float dist = distance(repeatedCoord, repeatedCenter);
    
    if (dist <= scaledRadius) {
      drawn = true;
      break;
    }
  }
  
  if (drawn) {
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
