/* eslint-disable */
'use strict';

const INTEGER_UNIFORMS = ['u_invert'];

// The host passes a recording prototype and installs these methods on every PenFX engine.
const install = ({ Engine }) => {
  Engine.prototype.bloom = function (threshold, radius, value, invert, glowColor, blendMode) {
    const skin = this._prepare();
    if (!skin) return;
    const normalizedThreshold = threshold > 1 ? threshold / 100 : threshold;
    const safeRadius = Math.min(256, Math.max(0, Math.abs(radius)));
    this._renderEffect(skin, this._program('bloom'), [{ name: 'u_image', texture: this.textures[0] }], {
      u_resolution: this.resolution,
      u_threshold: Math.min(1, Math.max(0, normalizedThreshold)),
      u_radius: safeRadius,
      u_value: value,
      u_invert: invert ? 1 : 0,
      u_color: glowColor
    }, INTEGER_UNIFORMS, blendMode);
  };

  Engine.prototype.deepGlow = function (threshold, radius, value, glowColor, blendMode) {
    this._singlePass(this._program('deepGlow'), {
      u_resolution: this.resolution,
      u_threshold: Math.min(1, Math.max(0, threshold > 1 ? threshold / 100 : threshold)),
      u_radius: Math.min(128, Math.max(0, Math.abs(radius))),
      u_value: Math.max(0, value),
      u_color: glowColor
    }, [], blendMode);
  };
};

module.exports = install;
