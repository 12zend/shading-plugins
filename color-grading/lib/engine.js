'use strict';

// The host passes a recording prototype and installs these methods on every PenFX engine.
const install = ({Engine}) => {
    Engine.prototype.colorGrade = function (exposure, temperature, tint, contrast, pivot, filter, saturation,
        mixValue, blendMode) {
        this._acerolaPass(this._program('acerolaColor'), 3, {
            u_value: exposure,
            u_value2: temperature,
            u_value3: tint,
            u_vec: [pivot, contrast],
            u_color: filter,
            u_color2: [saturation, 0, 0],
            u_mix: mixValue
        }, [], blendMode);
    };

    Engine.prototype.colorGrading = function (uniforms, mixValue, blendMode, time) {
        if (!uniforms || this._isNoOp(mixValue, blendMode)) return;
        this._singlePass(this._program('colorGrading'), Object.assign({}, uniforms, {
            u_mix: mixValue,
            u_resolution: this.resolution,
            u_time: Number(time) || 0
        }), [], blendMode);
    };
};

module.exports = install;
