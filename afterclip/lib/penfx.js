/* eslint-disable */
'use strict';

const shading = require('shading');
const { color, mixAmount, number, numberOr } = shading.penfx.helpers;

// Time of the block in seconds (local time, motion blur samples, ...). Used for Panzoid's `time` expressions.
const timeOf = util => {
  try {
    const time = Number(shading.objects.getTime(util));
    return Number.isFinite(time) ? time : 0;
  } catch (error) {
    return 0;
  }
};

// A pass of a converted Zoidium shader. Panzoid property names get the PenFX `u_` prefix.
const shaderPass = (program, properties = {}, integers = []) => {
  const uniforms = {};
  for (const name of Object.keys(properties)) uniforms[`u_${name}`] = properties[name];
  return { program, uniforms, integerUniforms: integers.map(name => `u_${name}`) };
};

// Panzoid built-in "Duplicate". rotation is in radians, like Panzoid's own setting.
const duplicatePass = ({ offset = [0, 0], multiplier = [1, 1], rotation = 0, repeat = 1 }) => ({
  program: 'afterclipBuiltinDuplicate',
  uniforms: { u_offset: offset, u_multiplier: multiplier, u_rotation: rotation, u_repeat: repeat ? 1 : 0 },
  integerUniforms: ['u_repeat']
});

const DOTWAVE_WARP = {
  Opacity: 1, Scale: [1, 1], Rotation: 0, Position: [0, 0], GridSize: 10, BoxScaleMin: 0, BoxScaleMax: 0.95,
  Color: [1, 1, 1]
};

// Each group preset returns its chain of passes (Zoidium order, first pass first) for the block's inputs.
const GROUPS = {
  afterclipGroupDotWavesCircularDotwave: (args, time) => [
  shaderPass('afterclipGroupGroupDotWavesCircularDotwaveGrayscaleGradient', { Power: 2 }),
  duplicatePass({ offset: [-time, 0], multiplier: [5.23, 1], rotation: Math.PI / 2, repeat: 1 }),
  shaderPass('afterclipGroupWarpPolarCoordinates'),
  shaderPass('afterclipGroupGroupDotWavesCircularDotwaveDotwaveWarp', DOTWAVE_WARP)]

};

// The host passes a recording prototype and installs these methods on every PenFX instance.
const install = ({ PenFX }) => {
  for (const opcode of Object.keys(GROUPS)) {
    const build = GROUPS[opcode];
    PenFX.prototype[opcode] = function (args, util) {
      const time = timeOf(util);
      const passes = build(args || {}, time);
      this._safe((engine) => engine.afterclipChain(passes, time, mixAmount(args && args.MIX), this.blendMode));
    };
  }
};

module.exports = install;
module.exports.GROUPS = GROUPS;
