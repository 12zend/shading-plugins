/* eslint-disable */
'use strict';

const {boolean, evolutionAmount, number, numberOr} = require('shading').penfx.helpers;

const {FRACTAL_NOISE_TYPES, FRACTAL_OVERFLOW_TYPES, FRACTAL_TYPES} = require('./constants.js');

// The host passes a recording prototype and installs these methods on every PenFX instance.
const install = ({ PenFX, vm }) => {
  PenFX.prototype.fractalnoise = function (args) {
    const rawFractalType = String(args.FRACTALTYPE);
    const rawNoiseType = String(args.NOISETYPE);
    const rawOverflow = String(args.OVERFLOW);
    const fractalType = FRACTAL_TYPES.includes(rawFractalType) ?
    rawFractalType : FRACTAL_TYPES[0];
    const noiseType = FRACTAL_NOISE_TYPES.includes(rawNoiseType) ?
    rawNoiseType : FRACTAL_NOISE_TYPES[0];
    const overflow = FRACTAL_OVERFLOW_TYPES.includes(rawOverflow) ?
    rawOverflow : FRACTAL_OVERFLOW_TYPES[0];
    this._safe((engine) => engine.fractalNoise(fractalType, noiseType, boolean(args.INVERT),
    numberOr(args.CONTRAST, 100), number(args.BRIGHTNESS), overflow, number(args.ROTATE),
    numberOr(args.SCALE, 100), numberOr(args.WIDTH, 100), numberOr(args.HEIGHT, 100),
    number(args.OX), number(args.OY), boolean(args.PERSPECTIVE), numberOr(args.DEPTH, 6),
    evolutionAmount(args.EVOLUTION), boolean(args.CYCLEEVOLUTION), numberOr(args.FREQ, 1), this.blendMode));
  };
};

module.exports = install;
