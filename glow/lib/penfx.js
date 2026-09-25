/* eslint-disable */
'use strict';

const {boolean, color, number} = require('shading').penfx.helpers;

// The host passes a recording prototype and installs these methods on every PenFX instance.
const install = ({ PenFX, vm }) => {
  PenFX.prototype.bloom = function (args) {
    this._safe((engine) => engine.bloom(number(args.THRESHOLD), number(args.RADIUS), number(args.VALUE),
    boolean(args.INVERT), color(args.COLOR || '#ffffff'), this.blendMode));
  };

  PenFX.prototype.deepGlow = function (args) {
    this._safe((engine) => engine.deepGlow(number(args.THRESHOLD), number(args.RADIUS), number(args.VALUE),
    color(args.COLOR || '#ffffff'), this.blendMode));
  };
};

module.exports = install;
