'use strict';

// Film & Retro: PenFX effect blocks for shading.app. Block ids and menus keep the names they had when these
// effects were built into the app, so existing projects load unchanged once the plugin is installed.
exports.activate = shading => {
    const penfx = shading.penfx;
    penfx.registerProgram('rgbShift', shading.files.text('shaders/rgbShift.glsl'));
    penfx.registerProgram('acerolaColor', shading.files.text('shaders/acerolaColor.glsl'), {boundsPadding: uniforms => (uniforms.u_mode === 10 ? null : 1)});
    penfx.registerProgram('signal', shading.files.text('shaders/signal.glsl'));
    penfx.extendEngine(require('./lib/acerola.js'));
    penfx.extendEngine(require('./lib/engine.js'));
    penfx.extendPenFX(require('./lib/penfx.js'));
    penfx.registerBlocks(shading.files.json('penfx-blocks.json'), {
        // Menus keep the names of the former built-in package so saved projects resolve them.
        menuNamespace: 'penfx-builtins',
        order: 230,
        translations: {ja: shading.files.json('locales/ja.json')},
        legacyMenus: {
            rgbPair: ["RG", "GB", "BR"]
        }
    });
};
