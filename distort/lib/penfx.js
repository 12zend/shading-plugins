/* eslint-disable */
'use strict';

const {boolean, evolutionAmount, mixAmount, number, numberOr, seedAmount} = require('shading').penfx.helpers;

const WAVY_TYPES = ['both', 'x', 'y', 'size', 'dir'];

const MIRROR_TYPES = ['x', 'y', 'xy'];

const TYPES = ['x', 'y', 'size', 'dir'];

const TYPE_NAMES = ['x', 'y', 'size', 'dir'];
const CHANNEL_NAMES = ['luminance', 'r', 'g', 'b', 'a'];

// The host passes a recording prototype and installs these methods on every PenFX instance.
const install = ({ PenFX, vm }) => {
  PenFX.prototype.wavy = function (args) {
    const rawType = String(args.TYPE);
    const type = WAVY_TYPES.includes(rawType) ? rawType : 'both';
    this._safe((engine) => engine.wavy(number(args.VALUE), seedAmount(args.SEED), number(args.X), number(args.Y),
    number(args.SIZE), numberOr(args.COMPLEXITY, 3), evolutionAmount(args.EVOLUTION), type,
    number(args.CENTERX), number(args.CENTERY), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.pulse = function (args) {
    this._safe((engine) => {
      const radius = number(args.RADIUS);
      return engine.geometry(0, 0, {
        center: [number(args.X), number(args.Y)],
        radius,
        value: number(args.VALUE),
        width: numberOr(args.WIDTH, Math.max(Math.abs(radius) * 0.22, 6)),
        frequency: numberOr(args.FREQUENCY, 0.55),
        mix: mixAmount(args.MIX)
      }, this.blendMode);
    });
  };

  PenFX.prototype.pixelate = function (args) {
    const oldSize = numberOr(args.SIZE, 8);
    this._safe((engine) => engine.geometry(1, 0, {
      blockSize: [numberOr(args.X, oldSize), numberOr(args.Y, oldSize)],
      offset: [numberOr(args.OFFSETX, 0), numberOr(args.OFFSETY, 0)],
      mix: mixAmount(args.MIX)
    }, this.blendMode));
  };

  PenFX.prototype.mirror = function (args) {
    const type = MIRROR_TYPES.indexOf(String(args.TYPE));
    this._safe((engine) => engine.geometry(2, Math.max(0, type), {
      center: [numberOr(args.X, 0), numberOr(args.Y, 0)], mix: mixAmount(args.MIX)
    }, this.blendMode));
  };

  PenFX.prototype.transform = function (args) {
    this._safe((engine) => engine.geometry(3, 0, {
      offset: [number(args.X), number(args.Y)],
      size: number(args.SIZE),
      direction: number(args.DIR),
      anchor: [numberOr(args.ANCHORX, 0), numberOr(args.ANCHORY, 0)],
      mix: mixAmount(args.MIX)
    }, this.blendMode));
  };

  PenFX.prototype.duplicate = function (args) {
    this._safe((engine) => engine.geometry(4, 0, {
      offset: [number(args.X), number(args.Y)],
      size: numberOr(args.SIZE, 50),
      direction: number(args.DIR),
      anchor: [numberOr(args.ANCHORX, 0), numberOr(args.ANCHORY, 0)],
      mix: mixAmount(args.MIX)
    }, this.blendMode));
  };

  PenFX.prototype.pixelStretch = function (args) {
    const rawType = String(args.TYPE);
    const type = TYPES.includes(rawType) ? rawType : 'x';
    this._safe((engine) => engine.pixelStretch(type, number(args.POSITION), number(args.SIZE),
    numberOr(args.SAMPLE, 1), number(args.CENTERX), number(args.CENTERY), mixAmount(args.MIX), this.blendMode));
  };

  PenFX.prototype.displacementMap = function (args, util) {
    const typeKey = String(args.TYPE);
    const channelKey = String(args.CHANNEL);
    const type = TYPE_NAMES.includes(typeKey) ? typeKey : 'x';
    const channel = CHANNEL_NAMES.includes(channelKey) ? channelKey : 'luminance';
    this._safe((engine) => engine.displacement(args.COSTUME, number(args.VALUE), type, channel,
    boolean(args.INVERT), numberOr(args.CENTER, 0.5), mixAmount(args.MIX), util.target, this.blendMode));
  };
};

module.exports = install;
