/* eslint-disable */
'use strict';

const CHROMA_KEY_BEHAVIORS = ['solid', 'gradient', 'transparent'];
const COLOR_BLINDNESS_TYPES = ['deuteranopia', 'protanopia', 'tritanopia'];
const TONE_MAP_TYPES = ['clamp', 'aces hill', 'aces', 'reinhard'];

// Read-only downstream (_render only calls indexOf), safe to share across calls.
const MODE_INTEGER_UNIFORMS = ['u_mode'];

// The host passes a recording prototype and installs these methods on every PenFX engine.
const install = ({ Engine }) => {
  Engine.prototype.rgbShift = function (direction, value, pair, mixValue, blendMode) {
    if (this._isNoOp(mixValue, blendMode)) return;
    this._singlePass(this._program('rgbShift'), {
      u_resolution: this.resolution,
      u_direction: direction,
      u_value: value,
      u_pair: pair,
      u_mix: mixValue
    }, ['u_pair'], blendMode);
  };

  Engine.prototype.dither = function (redCount, greenCount, blueCount, spread, scale, mixValue, blendMode) {
    this._acerolaPass(this._program('acerolaColor'), 4, {
      u_vec: [redCount, greenCount],
      u_value: blueCount,
      u_value2: spread,
      u_value3: scale,
      u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.filmGrain = function (intensity, response, size, animate, mixValue, blendMode) {
    this._acerolaPass(this._program('acerolaColor'), 5, {
      u_value: intensity,
      u_value2: response,
      u_value3: size,
      u_time: animate ? performance.now() / 1000 : 0,
      u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.halftone = function (size, mixValue, blendMode) {
    this._acerolaPass(this._program('acerolaColor'), 9, {
      u_value: Math.max(1, size), u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.crt = function (curvature, border, scanSize, scanStrength, mixValue, blendMode) {
    this._acerolaPass(this._program('acerolaColor'), 10, {
      u_value: curvature,
      u_value2: border,
      u_value3: scanSize,
      u_vec: [scanStrength, 0],
      u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.ascii = function (cellWidth, cellHeight, foreground, background, invert, mixValue, blendMode) {
    this._acerolaPass(this._program('acerolaColor'), 13, {
      u_type: invert ? 1 : 0,
      u_vec: [cellWidth, cellHeight],
      u_color: foreground,
      u_color2: background,
      u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.vhs = function (tracking, chroma, noise, scanlines, seed, evolution, mixValue, blendMode) {
    this._singlePass(this._program('signal'), {
      u_resolution: this.resolution,
      u_mode: 0,
      u_tracking: Math.min(128, Math.max(0, Math.abs(tracking))),
      u_chroma: Math.min(64, Math.max(0, Math.abs(chroma))),
      u_noise: Math.min(1, Math.max(0, noise)),
      u_scanlines: Math.min(1, Math.max(0, scanlines)),
      u_seed: seed,
      u_evolution: evolution,
      u_slices: 1,
      u_shift: 0,
      u_rgb: 0,
      u_density: 0,
      u_mix: mixValue
    }, MODE_INTEGER_UNIFORMS, blendMode);
  };

  Engine.prototype.digitalGlitch = function (slices, shift, rgb, density, seed, evolution, mixValue, blendMode) {
    this._singlePass(this._program('signal'), {
      u_resolution: this.resolution,
      u_mode: 1,
      u_tracking: 0,
      u_chroma: 0,
      u_noise: 0,
      u_scanlines: 0,
      u_seed: seed,
      u_evolution: evolution,
      u_slices: Math.min(256, Math.max(1, Math.round(Math.abs(slices)))),
      u_shift: Math.min(512, Math.max(0, Math.abs(shift))),
      u_rgb: Math.min(128, Math.max(0, Math.abs(rgb))),
      u_density: Math.min(1, Math.max(0, density)),
      u_mix: mixValue
    }, MODE_INTEGER_UNIFORMS, blendMode);
  };
};

module.exports = install;
