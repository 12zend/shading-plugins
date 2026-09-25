'use strict';

// Blur: PenFX effect blocks for shading.app. Block ids and menus keep the names they had when these
// effects were built into the app, so existing projects load unchanged once the plugin is installed.
exports.activate = shading => {
    const penfx = shading.penfx;
    penfx.registerProgram('gaussian', shading.files.text('shaders/gaussian.glsl'));
    penfx.registerProgram('lensBlur', shading.files.text('shaders/lensBlur.glsl'));
    penfx.registerProgram('depthOfField', shading.files.text('shaders/depthOfField.glsl'));
    penfx.extendEngine(require('./lib/engine.js'));
    penfx.extendPenFX(require('./lib/penfx.js'));
    penfx.registerBlocks(shading.files.json('penfx-blocks.json'), {
        // Menus keep the names of the former built-in package so saved projects resolve them.
        menuNamespace: 'penfx-builtins',
        order: 200,
        translations: {ja: shading.files.json('locales/ja.json')},
        legacyMenus: {
            gaussianType: ["normal", "horizontal", "vertical"],
            lensShape: ["circle", "hexagon", "octagon"],
            polarType: ["dir", "size"]
        }
    });
};
