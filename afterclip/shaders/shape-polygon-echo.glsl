// Ported from Zoidium plugins/afterclip/shaders/afterclip-shape-polygon-echo.glsl (Polygon Echo).
// Shader by AfterClip; Zoidium normalization by rbstxt (1zworks). MIT, see ../ZOIDIUM-LICENSE.md.
precision highp float;
precision highp int;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_mix;

uniform vec2 u_Scale;
uniform float u_Rotation;
uniform vec3 u_Color;
uniform float u_Opacity;
uniform int u_N;
uniform float u_StarInnerRadius;
uniform float u_Size;
uniform float u_Size2;
uniform float u_Width;
uniform vec2 u_Position;
uniform float u_PatternRotation;
uniform float u_Repeat;
uniform float u_Margin;
uniform float u_RotationStep;
uniform float u_StripeWidth;
uniform float u_StripeMargin;
uniform float u_StripeOffset;
uniform float u_StripeRotation;

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

#define MAX_ITERATIONS 100
#define PI 3.14159265359

int maxInt(int a, int b) {
    return a > b ? a : b;
}

int minInt(int a, int b) {
    return a < b ? a : b;
}

vec4 blendColors(vec4 baseColor, vec4 overlayColor) {
    float sourceAlpha = clamp(overlayColor.a, 0.0, 1.0);
    float backgroundAlpha = clamp(baseColor.a, 0.0, 1.0);
    float remainingBackground = backgroundAlpha * (1.0 - sourceAlpha);
    float outputAlpha = sourceAlpha + remainingBackground;
    vec3 outputColor = overlayColor.rgb * sourceAlpha + baseColor.rgb * (1.0 - sourceAlpha);
    return vec4(outputColor, outputAlpha);
}

vec2 rotate(vec2 uv, float angle) {
    float cosR = cos(angle);
    float sinR = sin(angle);
    vec2 rotatedUv;
    rotatedUv.x = uv.x * cosR - uv.y * sinR;
    rotatedUv.y = uv.x * sinR + uv.y * cosR;
    return rotatedUv;
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float polygonDistance(vec2 point, int sides, float radius, float rotationRad, float innerRadius) {
    if (sides == 0) {
        return length(point) - radius;
    }
    
    if (innerRadius != 0.0) {
        int numPoints = sides * 2;
        float segmentAngle = 2.0 * PI / float(numPoints);
        
        float minDist = 1e10;
        bool inside = false;
        
        for (int i = 0; i < MAX_ITERATIONS; i++) {
            if (i >= numPoints) break;
            
            float angle1 = rotationRad - PI / 2.0 + segmentAngle * float(i);
            float r1 = (i / 2 * 2 == i) ? radius : radius * innerRadius;
            vec2 v1 = vec2(cos(angle1), sin(angle1)) * r1;
            
            int nextI = i + 1;
            if (nextI >= numPoints) nextI = 0;
            float angle2 = rotationRad - PI / 2.0 + segmentAngle * float(nextI);
            float r2 = (nextI / 2 * 2 == nextI) ? radius : radius * innerRadius;
            vec2 v2 = vec2(cos(angle2), sin(angle2)) * r2;
            
            float d = sdSegment(point, v1, v2);
            minDist = min(minDist, d);
            
            if ((v1.y > point.y) != (v2.y > point.y)) {
                float intersectX = (v2.x - v1.x) * (point.y - v1.y) / (v2.y - v1.y) + v1.x;
                if (point.x < intersectX) {
                    inside = !inside;
                }
            }
        }
        
        return inside ? -minDist : minDist;
    } else {
        float angle = rotationRad + atan(point.y, point.x) - PI / 2.0;
        float segmentAngle = 2.0 * PI / float(sides);
        float distanceToEdge = radius * cos(segmentAngle / 2.0) / cos(mod(angle, segmentAngle) - segmentAngle / 2.0);
        return length(point) - distanceToEdge;
    }
}

void zoidiumMain() {
objectUv = standardObjectUv(v_uv);
vec4 sourceTexel = texture2D(u_image, v_uv);
if (u_Opacity <= 0.0) { gl_FragColor = premultiplyColor(sourceTexel); return; }
    vec2 uv = objectUv;
    vec4 texel = premultiplyColor(sourceTexel);
    
    vec2 adjustedUV = uv - vec2(0.5);
    adjustedUV.x *= 16.0 / 9.0;
    
    vec2 rotatedUvForStripe = rotate(adjustedUV, u_StripeRotation * PI / 180.0);
    
    float size = (u_Size + u_Size2) * 0.1;
    float margin = u_Margin * 0.1;
    float width = u_Width * 0.1;
    vec2 position = vec2(0.0);
    
    vec2 pos = adjustedUV - position;
    float dist = length(pos);
    
    bool isInRing = false;
    
    
    int startI = 0;
    int count = 1;
    
    if (u_Repeat > 0.0) {
        
        count = minInt(int(u_Repeat), MAX_ITERATIONS);
    } else if (abs(margin) > 0.0001) {
        
        float safetyMargin = max(width * 2.0, 1.0);
        
        if (margin > 0.0) {
            
            float minIf = (dist - size - width * 0.5 - safetyMargin) / margin;
            startI = maxInt(0, int(floor(minIf)));
            
            float maxIf = (dist - size + width * 0.5 + safetyMargin) / margin;
            int endI = int(ceil(maxIf)) + 1;
            
            count = maxInt(1, minInt(MAX_ITERATIONS, endI - startI));
        } else {
            
            float minIf = (dist + width * 0.5 + safetyMargin - size) / margin;
            startI = maxInt(0, int(floor(minIf)));
            
            float maxIf = (dist - width * 0.5 - safetyMargin - size) / margin;
            int endI = int(ceil(maxIf)) + 1;
            
            
            float maxIForPositive = (-size - width * 0.5) / margin;
            endI = minInt(endI, int(floor(maxIForPositive)) + 1);
            
            count = maxInt(1, minInt(MAX_ITERATIONS, endI - startI));
        }
    }
    
    
    for (int j = 0; j < MAX_ITERATIONS; j++) {
        if (j >= count) break;
        
        int i = startI + j;
        
        float currentRotation = (u_PatternRotation + u_RotationStep * float(i)) * PI / 180.0;
        
        float currentSize = size + margin * float(i);
        float outSize = currentSize + width / 2.0;
        float inSize = currentSize - width / 2.0;
        
        if (outSize <= 0.0) continue;
        
        float distOuter = polygonDistance(pos, u_N, outSize, currentRotation, u_StarInnerRadius);
        
        if (inSize <= 0.0) {
            if (distOuter < 0.0) {
                isInRing = true;
                break;
            }
        } else {
            float distInner = polygonDistance(pos, u_N, inSize, currentRotation, u_StarInnerRadius);
            if (distOuter < 0.0 && distInner > 0.0) {
                isInRing = true;
                break;
            }
        }
    }
    
    if (isInRing) {
        float newStripeOffset = u_StripeOffset + u_StripeWidth * u_StripeMargin / 2.0;
        bool showStripe = fract((rotatedUvForStripe.y + newStripeOffset / 100.0) / (u_StripeWidth / 100.0)) < u_StripeMargin;
        
        if (showStripe) {
            vec4 shapeColor = vec4(u_Color, u_Opacity);
            gl_FragColor = blendColors(texel, shapeColor);
        } else {
            gl_FragColor = texel;
        }
    } else {
        gl_FragColor = texel;
    }
}


void main() {
  vec4 zoidiumSource = texture2D(u_image, v_uv);
  zoidiumMain();
  gl_FragColor = mix(zoidiumSource, gl_FragColor, clamp(u_mix, 0.0, 1.0));
}
