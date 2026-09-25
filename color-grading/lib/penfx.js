'use strict';

const {color, mixAmount, number, numberOr} = require('shading').penfx.helpers;
const {findPreset} = require('./presets.js');
const {colorGradingUniforms} = require('./uniforms.js');

const uniformCache = new Map();

const uniformsFor = preset => {
    if (!uniformCache.has(preset.id)) uniformCache.set(preset.id, colorGradingUniforms(preset));
    return uniformCache.get(preset.id);
};

const currentBlockId = util => {
    const thread = util && util.thread;
    return thread && typeof thread.peekStack === 'function' ? thread.peekStack() || null : null;
};

// The host passes a recording prototype and installs these methods on every PenFX instance.
const install = ({PenFX, vm}) => {
    PenFX.prototype.colorGrade = function (args) {
        this._safe(engine => engine.colorGrade(number(args.EXPOSURE), number(args.TEMP), number(args.TINT),
            numberOr(args.CONTRAST, 1), numberOr(args.PIVOT, 0.5), color(args.COLOR || '#ffffff'),
            number(args.SATURATION), mixAmount(args.MIX), this.blendMode));
    };

    PenFX.prototype.easyColorGrading = function (args, util) {
        const preset = findPreset(args.PRESET);
        if (!preset) return;
        const uniforms = uniformsFor(preset);
        const mix = mixAmount(args.MIX);
        const blockId = currentBlockId(util);
        this._safe(engine => {
            // While the look picker is open it shows this block's input, captured inside the render transaction.
            this.captureInputPreview(engine, blockId);
            const timeline = vm.runtime.movieAssetManager && vm.runtime.movieAssetManager.timeline;
            engine.colorGrading(uniforms, mix, this.blendMode, Number(timeline && timeline.currentTime) || 0);
        }, {target: util && util.target});
    };
};

module.exports = install;
