/* eslint-disable */
'use strict';

// Shared default uniforms for acerola passes. The nested arrays are treated as
// read-only by _render, so every pass can reference the same instances instead
// of allocating fresh ones per block invocation.
const ACEROLA_DEFAULT_UNIFORMS = {
    u_color: [0, 0, 0],
    u_color2: [0, 0, 0],
    u_color3: [0, 0, 0],
    u_color4: [1, 1, 1],
    u_mix: 1,
    u_time: 0,
    u_type: 0,
    u_type2: 0,
    u_value: 0,
    u_value2: 0,
    u_value3: 0,
    u_vec: [0, 0],
    u_vec2: [0, 0]
};

const install = ({ Engine }) => {
  Engine.prototype._acerolaPass = function (program, mode, uniforms, integerUniforms, blendMode) {
    this._singlePass(program, Object.assign({
      u_mode: mode,
      u_resolution: this.resolution
    }, ACEROLA_DEFAULT_UNIFORMS, uniforms), ['u_mode', 'u_type', 'u_type2'].concat(integerUniforms || []), blendMode);
  };
};

module.exports = install;
