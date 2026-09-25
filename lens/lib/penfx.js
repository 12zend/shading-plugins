/* eslint-disable */
'use strict';

const {boolean, color, depthResource, mixAmount, number, numberOr} = require('shading').penfx.helpers;

const SAMPLE_MODES = ['clamp', 'mirror', 'wrap', 'border'];

const CHROMA_KEY_BEHAVIORS = ['solid', 'gradient', 'transparent'];
const COLOR_BLINDNESS_TYPES = ['deuteranopia', 'protanopia', 'tritanopia'];
const TONE_MAP_TYPES = ['clamp', 'aces hill', 'aces', 'reinhard'];

// Consumed synchronously by Engine._render via gl.uniform2fv and never
// retained, so a single reusable buffer is safe to fill per call.

const FOG_TYPES = ['linear', 'smooth', 'exponential', 'exponential squared'];

// The host passes a recording prototype and installs these methods on every PenFX instance.
const install = ({ PenFX, vm }) => {
  PenFX.prototype.chromaticAberration = function (args) {
    this._safe((engine) => engine.chromaticAberration(number(args.INTENSITY), numberOr(args.RADIUS, 1),
    numberOr(args.HARDNESS, 1), number(args.X), number(args.Y), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.zoom = function (args) {
    const sample = String(args.SAMPLE);
    const mode = SAMPLE_MODES.includes(sample) ? sample : 'clamp';
    this._safe((engine) => engine.zoom(numberOr(args.VALUE, 1), number(args.X), number(args.Y), mode, mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.vignette = function (args) {
    this._safe((engine) => engine.vignette(color(args.COLOR), numberOr(args.X, 1), numberOr(args.Y, 1),
    number(args.OFFSETX), number(args.OFFSETY), numberOr(args.INTENSITY, 1), numberOr(args.ROUNDNESS, 1),
    numberOr(args.SOFTNESS, 1), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.composition = function (args) {
    this._safe((engine) => engine.composition(numberOr(args.DIVISIONS, 3), numberOr(args.WIDTH, 1),
    Math.min(1, Math.max(0, numberOr(args.OPACITY, 50) / 100)), color(args.COLOR), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.framing = function (args) {
    this._safe((engine) => engine.framing(String(args.SHAPE) === 'circle' ? 'circle' : 'rectangle',
    numberOr(args.RADIUS, 0.45), numberOr(args.SOFTNESS, 0.02), color(args.COLOR),
    Math.min(1, Math.max(0, numberOr(args.OPACITY, 100) / 100)), number(args.X), number(args.Y),
    mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.lensDistortion = function (args) {
    this._safe((engine) => engine.lensDistortion(number(args.VALUE), number(args.X), number(args.Y),
    numberOr(args.ZOOM, 100), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.fog = function (args, util) {
    const typeKey = String(args.TYPE);
    const type = FOG_TYPES.includes(typeKey) ? typeKey : 'linear';
    this._safe((engine, renderContext) => engine.fog(depthResource(renderContext), type, numberOr(args.START, 100),
    numberOr(args.END, 1000), numberOr(args.DENSITY, 100) / 100, numberOr(args.CURVE, 1),
    color(args.NEARCOLOR || '#d9e7f2'), color(args.FARCOLOR || '#ffffff'), mixAmount(args.MIX), this.blendMode), {
      target: util && util.target
    });
  };
};

module.exports = install;
