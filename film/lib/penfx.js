/* eslint-disable */
'use strict';

const {boolean, color, evolutionAmount, mixAmount, number, numberOr, seedAmount} = require('shading').penfx.helpers;

const RGB_PAIRS = ['RG', 'GB', 'BR'];

const CHROMA_KEY_BEHAVIORS = ['solid', 'gradient', 'transparent'];
const COLOR_BLINDNESS_TYPES = ['deuteranopia', 'protanopia', 'tritanopia'];
const TONE_MAP_TYPES = ['clamp', 'aces hill', 'aces', 'reinhard'];

// Read-only downstream (_render only calls indexOf), safe to share across calls.

// The host passes a recording prototype and installs these methods on every PenFX instance.
const install = ({ PenFX, vm }) => {
  PenFX.prototype.rgbShift = function (args) {
    const pair = RGB_PAIRS.indexOf(String(args.COLOR).toUpperCase());
    this._safe((engine) => engine.rgbShift(number(args.DIR), number(args.VALUE), Math.max(0, pair), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.filmGrain = function (args) {
    this._safe((engine) => engine.filmGrain(numberOr(args.INTENSITY, 0.15), numberOr(args.RESPONSE, 0.15),
    numberOr(args.SIZE, 1), boolean(args.ANIMATE), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.dither = function (args) {
    this._safe((engine) => engine.dither(Math.min(32, Math.max(2, numberOr(args.R, 4))),
    Math.min(32, Math.max(2, numberOr(args.G, 4))), Math.min(32, Math.max(2, numberOr(args.B, 4))),
    numberOr(args.SPREAD, 0.5), Math.max(1, numberOr(args.SCALE, 1)), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.halftone = function (args) {
    this._safe((engine) => engine.halftone(numberOr(args.SIZE, 4), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.ascii = function (args) {
    this._safe((engine) => engine.ascii(Math.max(2, numberOr(args.X, 6)), Math.max(2, numberOr(args.Y, 8)),
    color(args.FG), color(args.BG), boolean(args.INVERT), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.crt = function (args) {
    this._safe((engine) => engine.crt(Math.max(1, numberOr(args.CURVATURE, 10)), Math.max(0.001, numberOr(args.BORDER, 0.08)),
    Math.max(1, numberOr(args.SIZE, 2)), Math.min(1, Math.max(0, numberOr(args.STRENGTH, 0.35))),
    mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.vhs = function (args) {
    this._safe((engine) => engine.vhs(numberOr(args.TRACKING, 6), numberOr(args.CHROMA, 3),
    numberOr(args.NOISE, 12) / 100, numberOr(args.SCANLINES, 25) / 100,
    seedAmount(args.SEED), evolutionAmount(args.EVOLUTION), mixAmount(args.MIX), this.blendMode),
    { groupEffectScope: 'expanded' });
  };

  PenFX.prototype.glitch = function (args) {
    this._safe((engine) => engine.digitalGlitch(numberOr(args.SLICES, 24), numberOr(args.SHIFT, 28),
    numberOr(args.RGB, 6), numberOr(args.DENSITY, 35) / 100, seedAmount(args.SEED), evolutionAmount(args.EVOLUTION),
    mixAmount(args.MIX), this.blendMode),
    { groupEffectScope: 'expanded' });
  };
};

module.exports = install;
