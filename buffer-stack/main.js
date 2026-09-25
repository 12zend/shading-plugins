'use strict';

// Buffer Stack: PenFX effect blocks for shading.app. Block ids and menus keep the names they had when these
// effects were built into the app, so existing projects load unchanged once the plugin is installed.
exports.activate = shading => {
    const penfx = shading.penfx;
    penfx.registerProgram('stack', shading.files.text('shaders/stack.glsl'));
    // Stacked frames match the pen layer size, so they are dropped whenever the stage is resized.
    penfx.extendEngine(require('./lib/engine.js'), {onResize: engine => engine.clearBufferStack()});
    penfx.extendPenFX(require('./lib/penfx.js'));
    penfx.registerBlocks(shading.files.json('penfx-blocks.json'), {
        // Menus keep the names of the former built-in package so saved projects resolve them.
        menuNamespace: 'penfx-builtins',
        order: 290,
        translations: {ja: shading.files.json('locales/ja.json')},
        legacyMenus: {
            bufferMode: ["average", "add", "lighten", "darken"]
        }
    });
};
