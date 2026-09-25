/* eslint-disable */
'use strict';

const SAMPLE_MODES = ['clamp', 'mirror', 'wrap', 'border'];

const CHROMA_KEY_BEHAVIORS = ['solid', 'gradient', 'transparent'];
const COLOR_BLINDNESS_TYPES = ['deuteranopia', 'protanopia', 'tritanopia'];
const TONE_MAP_TYPES = ['clamp', 'aces hill', 'aces', 'reinhard'];

// Consumed synchronously by Engine._render via gl.uniform2fv and never
// retained, so a single reusable buffer is safe to fill per call.
const CENTER_SCRATCH = [0, 0];

const FOG_TYPES = ['linear', 'smooth', 'exponential', 'exponential squared'];

// The host passes a recording prototype and installs these methods on every PenFX engine.
const install = ({ Engine }) => {
  Engine.prototype.chromaticAberration = function (intensity, radius, hardness, offsetX, offsetY, mixValue, blendMode) {
    this._acerolaPass(this._program('acerolaSpatial'), 2, {
      u_value: intensity / 100,
      u_value2: radius,
      u_value3: hardness,
      u_vec: [offsetX, offsetY],
      u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.zoom = function (value, offsetX, offsetY, sampleMode, mixValue, blendMode) {
    this._acerolaPass(this._program('acerolaSpatial'), 5, {
      u_type: Math.max(0, SAMPLE_MODES.indexOf(sampleMode)),
      u_value: Math.max(0.001, value),
      u_vec: [offsetX, offsetY],
      u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.vignette = function (vignetteColor, sizeX, sizeY, offsetX, offsetY, intensity, roundness, softness, mixValue, blendMode) {
    this._acerolaPass(this._program('acerolaColor'), 7, {
      u_vec: [sizeX, sizeY],
      u_vec2: [offsetX, offsetY],
      u_value: intensity,
      u_value2: roundness,
      u_value3: softness,
      u_color: vignetteColor,
      u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.composition = function (divisions, width, opacity, lineColor, mixValue, blendMode) {
    this._acerolaPass(this._program('acerolaColor'), 8, {
      u_type: Math.min(12, Math.max(2, Math.round(divisions))),
      u_value: width,
      u_value2: opacity,
      u_color: lineColor,
      u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.framing = function (shape, radius, softness, frameColor, opacity, offsetX, offsetY, mixValue, blendMode) {
    this._acerolaPass(this._program('acerolaColor'), 14, {
      u_type: shape === 'circle' ? 1 : 0,
      u_value: radius,
      u_value2: softness,
      u_value3: opacity,
      u_vec2: [offsetX, offsetY],
      u_color: frameColor,
      u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.lensDistortion = function (value, centerX, centerY, zoom, mixValue, blendMode) {
    CENTER_SCRATCH[0] = centerX;
    CENTER_SCRATCH[1] = centerY;
    this._singlePass(this._program('lensDistortion'), {
      u_resolution: this.resolution,
      u_center: CENTER_SCRATCH,
      u_value: Math.min(2, Math.max(-2, value / 100)),
      u_zoom: Math.max(0.01, zoom / 100),
      u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.fog = function (depthBuffer, type, start, end, density, curve, nearColor, farColor, mixValue, blendMode) {
    if (!depthBuffer || this._isNoOp(mixValue, blendMode)) return;
    const skin = this._prepare();
    if (!skin) return;
    const flatDepth = Number(depthBuffer.flatDepth);
    const hasFlatDepth = Number.isFinite(flatDepth) && flatDepth > 0;
    const depthTexture = hasFlatDepth ? this.textures[0] : this._uploadDepthBuffer(depthBuffer);
    if (!depthTexture) return;
    const cameraNear = hasFlatDepth ? 0.1 : Math.max(0.0001, Number(depthBuffer.near) || 0.1);
    const cameraFar = hasFlatDepth ? 1 : Math.max(cameraNear + 0.0001, Number(depthBuffer.far) || 1);
    const mode = Math.max(0, FOG_TYPES.indexOf(type));
    this._renderEffect(skin, this._program('fog'), [
    { name: 'u_image', texture: this.textures[0] },
    { name: 'u_depth', texture: depthTexture }],
    {
      u_cameraNear: cameraNear,
      u_cameraFar: cameraFar,
      u_flatDepth: hasFlatDepth ? flatDepth : -1,
      u_mode: mode,
      u_start: start,
      u_end: end,
      u_density: Math.min(1, Math.max(0, density)),
      u_curve: Math.min(100, Math.max(0.01, curve)),
      u_nearColor: nearColor,
      u_farColor: farColor,
      u_mix: mixValue
    }, ['u_mode'], blendMode);
  };
};

module.exports = install;
