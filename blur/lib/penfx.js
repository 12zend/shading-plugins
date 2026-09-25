/* eslint-disable */
'use strict';

const {depthResource, mixAmount, number, numberOr} = require('shading').penfx.helpers;

const GAUSSIAN_TYPES = ['normal', 'horizontal', 'vertical'];

const SHAPES = ['circle', 'hexagon', 'octagon'];

// The host passes a recording prototype and installs these methods on every PenFX instance.
const install = ({ PenFX, vm }) => {
  PenFX.prototype.gaussianBlur = function (args) {
    const rawType = String(args.TYPE);
    const type = GAUSSIAN_TYPES.includes(rawType) ? rawType : 'normal';
    this._safe((engine) => engine.gaussian(type, 0, number(args.VALUE), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.directionalBlur = function (args) {
    this._safe((engine) => engine.gaussian('directional', number(args.DIR), number(args.VALUE), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.radialBlur = function (args) {
    const type = String(args.TYPE) === 'size' ? 'size' : 'dir';
    this._safe((engine) => engine.radial(type, number(args.VALUE), numberOr(args.X, 0), numberOr(args.Y, 0), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.lensBlur = function (args) {
    const shapeName = String(args.SHAPE);
    const shape = shapeName === 'hexagon' || shapeName === 'octagon' ? shapeName : 'circle';
    this._safe((engine) => engine.lensBlur(number(args.RADIUS), shape, numberOr(args.ROTATION, 0), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.depthOfField = function (args, util) {
    const shapeName = String(args.SHAPE);
    const shape = SHAPES.includes(shapeName) ? shapeName : 'circle';
    this._safe((engine, renderContext) => engine.depthOfField(depthResource(renderContext),
    numberOr(args.FOCUS, 480), numberOr(args.RANGE, 24), numberOr(args.APERTURE, 48),
    numberOr(args.MAXBLUR, 24), numberOr(args.NEAR, 100) / 100, numberOr(args.FAR, 100) / 100,
    numberOr(args.EDGE, 8), shape, numberOr(args.ROTATION, 0), mixAmount(args.MIX), this.blendMode), {
      target: util && util.target
    });
  };
};

module.exports = install;
