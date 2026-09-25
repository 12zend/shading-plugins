'use strict';

const {FRACTAL_TYPES, FRACTAL_NOISE_TYPES, FRACTAL_OVERFLOW_TYPES} = require('./lib/constants.js');

// Fractal Noise: PenFX effect blocks for shading.app. Block ids and menus keep the names they had when these
// effects were built into the app, so existing projects load unchanged once the plugin is installed.
exports.activate = shading => {
    const penfx = shading.penfx;
    penfx.registerProgram('fractalNoise', shading.files.text('shaders/fractalNoise.glsl'));
    penfx.extendEngine(require('./lib/engine.js'));
    penfx.extendPenFX(require('./lib/penfx.js'));
    penfx.registerBlocks(shading.files.json('penfx-blocks.json'), {
        // Menus keep the names of the former built-in package so saved projects resolve them.
        menuNamespace: 'penfx-builtins',
        order: 260,
        translations: {ja: shading.files.json('locales/ja.json')},
        legacyMenus: {
            fractalType: FRACTAL_TYPES,
            fractalNoiseType: FRACTAL_NOISE_TYPES,
            fractalOverflowType: FRACTAL_OVERFLOW_TYPES
        }
    });
};
