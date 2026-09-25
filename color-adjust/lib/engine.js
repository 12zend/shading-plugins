/* eslint-disable */
'use strict';

// Shared default vec3 uniforms and the integer-uniform list are read-only as
// far as Engine._render is concerned (values are copied via gl.uniform*fv /
// matched via indexOf), so every call can reference the same instances
// instead of allocating fresh ones per rendered frame.
const VEC3_ZERO = [0, 0, 0];
const VEC3_ONE = [1, 1, 1];
const COLOR_INTEGER_UNIFORMS = ['u_mode'];

const CHROMA_KEY_BEHAVIORS = ['solid', 'gradient', 'transparent'];
const COLOR_BLINDNESS_TYPES = ['deuteranopia', 'protanopia', 'tritanopia'];
const TONE_MAP_TYPES = ['clamp', 'aces hill', 'aces', 'reinhard'];

const COLOR_KEYS = ['u_color0', 'u_color1', 'u_color2', 'u_color3', 'u_color4', 'u_color5', 'u_color6', 'u_color7'];
const POSITION_KEYS = ['u_position0', 'u_position1', 'u_position2', 'u_position3', 'u_position4', 'u_position5', 'u_position6', 'u_position7'];
const INTEGER_UNIFORMS = ['u_stopCount'];

// The host passes a recording prototype and installs these methods on every PenFX engine.
const install = ({ Engine }) => {
  Engine.prototype.color = function (mode, uniforms, blendMode) {
    const mix = uniforms.mix === undefined ? 1 : uniforms.mix;
    if (this._isNoOp(mix, blendMode)) return;
    this._singlePass(this._program('color'), {
      u_mode: mode,
      u_value: uniforms.value === undefined ? 1 : uniforms.value,
      u_mix: mix,
      u_pivot: uniforms.pivot === undefined ? 0.5 : uniforms.pivot,
      u_color: uniforms.color || VEC3_ZERO,
      u_add: uniforms.add || VEC3_ZERO,
      u_mul: uniforms.mul || VEC3_ONE,
      u_div: uniforms.div || VEC3_ONE
    }, COLOR_INTEGER_UNIFORMS, blendMode);
  };

  Engine.prototype.alpha = function (value, mixValue, blendMode) {
    this._acerolaPass(this._program('acerolaColor'), 0, { u_value: value, u_mix: mixValue }, [], blendMode);
  };

  Engine.prototype.chromaKey = function (keyColor, tolerance, softness, behavior, replacement, gradientEnd, mixValue, blendMode) {
    const behaviorIndex = CHROMA_KEY_BEHAVIORS.indexOf(behavior);
    this._acerolaPass(this._program('acerolaColor'), 1, {
      u_type: Math.max(0, behaviorIndex),
      u_value: tolerance,
      u_value2: softness,
      u_color: keyColor,
      u_color2: replacement,
      u_color3: gradientEnd,
      u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.colorBlindness = function (type, severity, mixValue, blendMode) {
    this._acerolaPass(this._program('acerolaColor'), 2, {
      u_type: Math.max(0, COLOR_BLINDNESS_TYPES.indexOf(type)),
      u_value: severity,
      u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.toneMap = function (type, exposure, whitePoint, mixValue, blendMode) {
    this._acerolaPass(this._program('acerolaColor'), 6, {
      u_type: Math.max(0, TONE_MAP_TYPES.indexOf(type)),
      u_value: exposure,
      u_value2: whitePoint,
      u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.paletteSwap = function (colors, mixValue, blendMode) {
    this._acerolaPass(this._program('acerolaColor'), 11, {
      u_color: colors[0],
      u_color2: colors[1],
      u_color3: colors[2],
      u_color4: colors[3],
      u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.colorSpaceAdjust = function (hueAdd, hueMultiply, saturationAdd, saturationMultiply, lightnessAdd, lightnessMultiply, mixValue, blendMode) {
    this._acerolaPass(this._program('acerolaColor'), 12, {
      u_value: hueAdd,
      u_value2: hueMultiply,
      u_vec: [saturationAdd, saturationMultiply],
      u_vec2: [lightnessAdd, lightnessMultiply],
      u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.autoExposure = function (target, minimum, maximum, mixValue, blendMode) {
    this._acerolaPass(this._program('acerolaColor'), 15, {
      u_value: target, u_value2: minimum, u_value3: maximum, u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.colorOverlay = function (overlayColor, mixValue, blendMode) {
    if (this._isNoOp(mixValue, blendMode)) return;
    this._singlePass(this._program('colorOverlay'), {
      u_color: overlayColor,
      u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.gradationOverlay = function (stops, direction, mixValue, blendMode) {
    if (this._isNoOp(mixValue, blendMode) || !Array.isArray(stops) || !stops.length) return;

    const stopCount = Math.min(8, stops.length);
    const lastStop = stops[stopCount - 1];
    const uniforms = {
      u_direction: direction,
      u_mix: mixValue,
      u_stopCount: stopCount
    };
    for (let index = 0; index < 8; index++) {
      const stop = stops[index] || lastStop;
      uniforms[COLOR_KEYS[index]] = stop.color;
      uniforms[POSITION_KEYS[index]] = stop.position;
    }
    this._singlePass(this._program('gradationOverlay'),
    uniforms, INTEGER_UNIFORMS, blendMode);
  };
};

module.exports = install;
