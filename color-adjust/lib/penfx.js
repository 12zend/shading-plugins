/* eslint-disable */
'use strict';

const {boolean, color, gradient, mixAmount, number, numberOr} = require('shading').penfx.helpers;

const CHROMA_KEY_BEHAVIORS = ['solid', 'gradient', 'transparent'];
const COLOR_BLINDNESS_TYPES = ['deuteranopia', 'protanopia', 'tritanopia'];
const TONE_MAP_TYPES = ['clamp', 'aces hill', 'aces', 'reinhard'];

// The host passes a recording prototype and installs these methods on every PenFX instance.
const install = ({ PenFX, vm }) => {
  const invokeColor = (mode, values) => function (args) {
    const uniforms = values(args);
    this._safe((engine) => engine.color(mode, uniforms, this.blendMode));
  };

  PenFX.prototype.contrast = invokeColor(0, (args) => ({
    value: number(args.VALUE), pivot: numberOr(args.PIVOT, 0.5), mix: mixAmount(args.MIX)
  }));

  PenFX.prototype.brightness = invokeColor(1, (args) => ({
    color: color(args.COLOR), value: numberOr(args.VALUE, 1), mix: mixAmount(args.MIX)
  }));

  PenFX.prototype.gamma = invokeColor(2, (args) => ({ value: number(args.VALUE), mix: mixAmount(args.MIX) }));

  PenFX.prototype.saturation = invokeColor(3, (args) => ({ value: number(args.VALUE), mix: mixAmount(args.MIX) }));

  PenFX.prototype.colorAdjustment = invokeColor(4, (args) => ({
    add: color(args.ADD), mul: color(args.MUL), div: color(args.DIV), mix: mixAmount(args.MIX)
  }));

  PenFX.prototype.alpha = function (args) {
    this._safe((engine) => engine.alpha(numberOr(args.VALUE, 100) / 100, mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.colorBlindness = function (args) {
    const requested = String(args.TYPE);
    const type = COLOR_BLINDNESS_TYPES.includes(requested) ? requested : 'deuteranopia';
    this._safe((engine) => engine.colorBlindness(type, Math.min(1, Math.max(0, number(args.SEVERITY) / 100)), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.colorSpaceAdjust = function (args) {
    const hueAdd = number(args.HADD);
    const hueMultiply = numberOr(args.HMUL, 1);
    const saturationAdd = number(args.SADD);
    const saturationMultiply = numberOr(args.SMUL, 1);
    const lightnessAdd = number(args.LADD);
    const lightnessMultiply = numberOr(args.LMUL, 1);
    const mixValue = mixAmount(args.MIX);
    this._safe((engine) => engine.colorSpaceAdjust(hueAdd, hueMultiply, saturationAdd, saturationMultiply,
    lightnessAdd, lightnessMultiply, mixValue, this.blendMode));
  };

  PenFX.prototype.toneMap = function (args) {
    const requested = String(args.TYPE);
    const type = TONE_MAP_TYPES.includes(requested) ? requested : 'aces';
    this._safe((engine) => engine.toneMap(type, number(args.EXPOSURE), numberOr(args.WHITE, 4), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.autoExposure = function (args) {
    const minimum = Math.max(0, numberOr(args.MIN, 0.25));
    const maximum = Math.max(minimum, numberOr(args.MAX, 4));
    this._safe((engine) => engine.autoExposure(Math.max(0.001, numberOr(args.TARGET, 0.18)), minimum, maximum, mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.paletteSwap = function (args) {
    this._safe((engine) => engine.paletteSwap([color(args.C1), color(args.C2), color(args.C3), color(args.C4)], mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.chromaKey = function (args) {
    const requested = String(args.BEHAVIOR);
    const behavior = CHROMA_KEY_BEHAVIORS.includes(requested) ? requested : 'solid';
    this._safe((engine) => engine.chromaKey(color(args.KEY), Math.max(0, number(args.TOLERANCE)),
    Math.max(0.0001, numberOr(args.SOFTNESS, 0.05)), behavior, color(args.COLOR1), color(args.COLOR2),
    mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.colorOverlay = function (args) {
    this._safe((engine) => engine.colorOverlay(color(args.COLOR || '#ffffff'), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.gradationOverlay = function (args) {
    this._safe((engine) => engine.gradationOverlay(
      gradient(args.GRADIENT), numberOr(args.DIR, 90), mixAmount(args.MIX), this.blendMode
    ));
  };
};

module.exports = install;
