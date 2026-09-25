'use strict';

// The host passes a recording prototype and installs these methods on every PenFX engine.
const install = ({Engine}) => {
    Engine.prototype.lut = function (entry, amount, blendMode) {
        if (!entry || !entry.gpu || this._isNoOp(amount, blendMode)) return;
        const skin = this._prepare();
        if (!skin) return;
        this._renderEffect(skin, this._program('lut'), [
            {name: 'u_image', texture: this.textures[0]},
            {name: 'u_lut', texture: entry.gpu.texture}
        ], {
            u_lutResolution: [entry.gpu.width, entry.gpu.height],
            u_size: entry.size,
            u_columns: entry.gpu.columns,
            u_mix: amount
        }, [], blendMode);
    };
};

module.exports = install;
