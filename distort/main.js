'use strict';

// Distort: PenFX effect blocks for shading.app. Block ids and menus keep the names they had when these
// effects were built into the app, so existing projects load unchanged once the plugin is installed.
exports.activate = shading => {
    const penfx = shading.penfx;
    penfx.registerProgram('wavy', shading.files.text('shaders/wavy.glsl'));
    penfx.registerProgram('geometry', shading.files.text('shaders/geometry.glsl'));
    penfx.registerProgram('pixelStretch', shading.files.text('shaders/pixelStretch.glsl'));
    penfx.registerProgram('displacement', shading.files.text('shaders/displacement.glsl'));
    penfx.extendEngine(require('./lib/engine.js'));
    penfx.extendPenFX(require('./lib/penfx.js'));
    penfx.registerBlocks(shading.files.json('penfx-blocks.json'), {
        // Menus keep the names of the former built-in package so saved projects resolve them.
        menuNamespace: 'penfx-builtins',
        order: 250,
        translations: {ja: shading.files.json('locales/ja.json')},
        legacyMenus: {
            turbulenceType: ["both", "x", "y", "size", "dir"],
            stretchType: ["x", "y", "size", "dir"],
            mirrorType: ["x", "y", "xy"],
            axisType: ["x", "y", "size", "dir"],
            mapChannel: ["luminance", "r", "g", "b", "a"],
            sampleMode: ["clamp", "mirror", "wrap", "border"]
        }
    });
};
