'use strict';

// Stylize: PenFX effect blocks for shading.app. Block ids and menus keep the names they had when these
// effects were built into the app, so existing projects load unchanged once the plugin is installed.
exports.activate = shading => {
    const penfx = shading.penfx;
    penfx.registerProgram('stroke', shading.files.text('shaders/stroke.glsl'));
    penfx.registerProgram('sharpen', shading.files.text('shaders/sharpen.glsl'));
    penfx.registerProgram('acerolaSpatial', shading.files.text('shaders/acerolaSpatial.glsl'));
    penfx.extendEngine(require('./lib/engine.js'));
    penfx.extendPenFX(require('./lib/penfx.js'));
    penfx.registerBlocks(shading.files.json('penfx-blocks.json'), {
        // Menus keep the names of the former built-in package so saved projects resolve them.
        menuNamespace: 'penfx-builtins',
        order: 220,
        translations: {ja: shading.files.json('locales/ja.json')}
    });
};
