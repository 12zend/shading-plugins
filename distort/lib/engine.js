/* eslint-disable */
'use strict';

const WAVY_TYPES = ['both', 'x', 'y', 'size', 'dir'];

const INTEGER_UNIFORMS = ['u_mode', 'u_type'];

const TYPES = ['x', 'y', 'size', 'dir'];

const TYPE_NAMES = ['x', 'y', 'size', 'dir'];
const CHANNEL_NAMES = ['luminance', 'r', 'g', 'b', 'a'];

// The host passes a recording prototype and installs these methods on every PenFX engine.
const install = ({ Engine }) => {
  Engine.prototype.wavy = function (value, seed, offsetX, offsetY, size, complexity, evolution, type, centerX, centerY,
  mixValue, blendMode) {
    if (this._isNoOp(mixValue, blendMode)) return;
    this._singlePass(this._program('wavy'), {
      u_resolution: this.resolution,
      u_value: value,
      u_seed: seed,
      u_offset: [offsetX, offsetY],
      u_center: [centerX, centerY],
      u_size: size,
      u_complexity: Math.min(8, Math.max(1, complexity)),
      u_evolution: evolution,
      u_type: Math.max(0, WAVY_TYPES.indexOf(type)),
      u_mix: mixValue
    }, ['u_type'], blendMode);
  };

  Engine.prototype.geometry = function (mode, type, uniforms, blendMode) {
    const value = uniforms.value;
    const radius = uniforms.radius;
    const center = uniforms.center;
    const offset = uniforms.offset;
    const anchor = uniforms.anchor;
    const blockSize = uniforms.blockSize;
    const size = uniforms.size;
    const direction = uniforms.direction;
    const width = uniforms.width;
    const frequency = uniforms.frequency;
    const mix = uniforms.mix;
    this._singlePass(this._program('geometry'), {
      u_resolution: this.resolution,
      u_mode: mode,
      u_type: type,
      u_value: value === undefined ? 0 : value,
      u_radius: radius === undefined ? 0 : radius,
      u_center: center || [0, 0],
      u_offset: offset || [0, 0],
      u_anchor: anchor || [0, 0],
      u_blockSize: blockSize || [1, 1],
      u_size: size === undefined ? 100 : size,
      u_direction: direction === undefined ? 0 : direction,
      u_width: width === undefined ? 6 : width,
      u_frequency: frequency === undefined ? 0.55 : frequency,
      u_mix: mix === undefined ? 1 : mix
    }, INTEGER_UNIFORMS, blendMode);
  };

  Engine.prototype.pixelStretch = function (type, position, size, sampleSize, centerX, centerY, mixValue, blendMode) {
    this._singlePass(this._program('pixelStretch'), {
      u_resolution: this.resolution,
      u_type: Math.max(0, TYPES.indexOf(type)),
      u_position: position,
      u_size: Math.max(0, Math.abs(size)),
      u_sampleSize: Math.min(9, Math.max(1, Math.abs(sampleSize))),
      u_center: [centerX, centerY],
      u_mix: mixValue
    }, ['u_type'], blendMode);
  };

  Engine.prototype.displacement = function (costume, value, type, channel, invert, center, mixValue, target, blendMode) {
    if (this.blendOpacity <= 0 || this._isNoOp(mixValue, blendMode)) return;
    const mapTexture = this._costumeTexture(costume, target);
    if (!mapTexture) return;
    const skin = this._prepare();
    if (!skin) return;
    const typeIndex = TYPE_NAMES.indexOf(type);
    const channelIndex = CHANNEL_NAMES.indexOf(channel);
    this._renderEffect(skin, this._program('displacement'), [
    { name: 'u_image', texture: this.textures[0] },
    { name: 'u_map', texture: mapTexture }],
    {
      u_resolution: this.resolution,
      u_value: value,
      u_type: Math.max(0, typeIndex),
      u_channel: Math.max(0, channelIndex),
      u_invert: invert ? 1 : 0,
      u_center: center,
      u_mix: mixValue
    }, ['u_type', 'u_channel', 'u_invert'], blendMode);
  };

  Engine.prototype._costumeTexture = function (costumeName, target) {
    const renderer = this.renderer;
    if (!target || typeof target.getCostumes !== 'function' || !renderer._allSkins) return null;
    const costumes = target.getCostumes();
    let costume = costumes.find((item) => item.name === String(costumeName));
    if (!costume) {
      const numericIndex = Math.floor(Number(costumeName)) - 1;
      if (Number.isFinite(numericIndex)) costume = costumes[numericIndex];
    }
    if (!costume) return null;
    const skin = renderer._allSkins[costume.skinId];
    // Reuse the renderer texture so this block never waits for an Image load.
    return skin && typeof skin.getTexture === 'function' ? skin.getTexture([100, 100]) : null;
  };
};

module.exports = install;
