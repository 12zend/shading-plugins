'use strict';

const {mixAmount} = require('shading').penfx.helpers;
const {easyBlocks, findEasyPreset} = require('./presets.js');

// Every step goes through the block's public method, so it gets the same program overrides, group scope and frame
// transaction as the standalone block. The steps only queue their effects; nothing here waits.
const runEasySteps = (penFX, preset, mix, util) => {
    for (const step of preset.steps) {
        const method = penFX[step.method];
        if (typeof method !== 'function') continue;
        const args = Object.assign({}, step.args);
        const base = Number(args[step.strength]);
        args[step.strength] = (Number.isFinite(base) ? base : 100) * mix;
        if (!step.blend) {
            method.call(penFX, args, util);
            continue;
        }
        // Effects record the blend mode when they are queued, so the override only has to span the call.
        const previousBlendMode = penFX.blendMode;
        penFX.blendMode = step.blend;
        try {
            method.call(penFX, args, util);
        } finally {
            penFX.blendMode = previousBlendMode;
        }
    }
};

const currentBlockId = util => {
    const thread = util && util.thread;
    return thread && typeof thread.peekStack === 'function' ? thread.peekStack() || null : null;
};

// The host passes a recording prototype and installs these methods on every PenFX instance.
const install = ({PenFX}) => {
    for (const block of easyBlocks) {
        PenFX.prototype[block.opcode] = function (args, util) {
            const preset = findEasyPreset(block.opcode, args.PRESET);
            if (!preset) return;
            const blockId = currentBlockId(util);
            if (this.hasInputPreviewListener(blockId)) {
                this._safe(engine => this.captureInputPreview(engine, blockId), {target: util && util.target});
            }
            const mix = mixAmount(args.MIX);
            if (mix <= 0) return;
            runEasySteps(this, preset, mix, util);
        };
    }

    // Queues a preset's effects without the preview capture, for the picker's thumbnail renderer.
    PenFX.prototype.runEasyPreset = function (opcode, presetValue, mix = 1, util = null) {
        const preset = findEasyPreset(opcode, presetValue);
        if (preset && mix > 0) runEasySteps(this, preset, mix, util);
    };
};

module.exports = install;
