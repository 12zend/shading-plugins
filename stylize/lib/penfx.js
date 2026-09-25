/* eslint-disable */
'use strict';

const {boolean, color, mixAmount, number, numberOr} = require('shading').penfx.helpers;

const SAMPLE_MODES = ['clamp', 'mirror', 'wrap', 'border'];

// The host passes a recording prototype and installs these methods on every PenFX instance.
const install = ({ PenFX, vm }) => {
  PenFX.prototype.stroke = function (args) {
    this._safe((engine) => engine.stroke(color(args.COLOR || '#000000'), numberOr(args.WIDTH, 4), this.blendMode));
  };

  PenFX.prototype.edgeDetection = function (args) {
    const hasBackground = args.BACKGROUND !== undefined && args.BACKGROUND !== null && args.BACKGROUND !== '';
    this._safe((engine) => engine.edgeDetection(number(args.THRESHOLD), numberOr(args.VALUE, 1),
    numberOr(args.RADIUS, 1), numberOr(args.SOFTNESS, 0.02), color(args.COLOR || '#000000'),
    color(hasBackground ? args.BACKGROUND : '#000000'), hasBackground,
    Math.min(1, Math.max(0, numberOr(args.ALPHA, 100) / 100)), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.fxaa = function (args) {
    this._safe((engine) => engine.fxaa(numberOr(args.CONTRAST, 0.0312), numberOr(args.RELATIVE, 0.063),
    numberOr(args.SUBPIXEL, 1), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.differenceOfGaussians = function (args) {
    this._safe((engine) => engine.differenceOfGaussians(numberOr(args.SIGMA, 1), numberOr(args.SCALE, 1.6),
    numberOr(args.TAU, 0.98), numberOr(args.THRESHOLD, 0.02), boolean(args.COLORED),
    color(args.COLOR || '#101020'), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.kuwahara = function (args) {
    this._safe((engine) => engine.kuwahara(numberOr(args.RADIUS, 4), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.sharpen = function (args) {
    this._safe((engine) => engine.sharpen(number(args.VALUE), numberOr(args.RADIUS, 1), mixAmount(args.MIX), this.blendMode));
  };
};

module.exports = install;
