'use strict';

// Lens & Frame: PenFX effect blocks for shading.app. Block ids and menus keep the names they had when these
// effects were built into the app, so existing projects load unchanged once the plugin is installed.
exports.activate = shading => {
    const penfx = shading.penfx;
    penfx.registerProgram('acerolaSpatial', shading.files.text('shaders/acerolaSpatial.glsl'));
    penfx.registerProgram('acerolaColor', shading.files.text('shaders/acerolaColor.glsl'), {boundsPadding: uniforms => (uniforms.u_mode === 10 ? null : 1)});
    penfx.registerProgram('lensDistortion', shading.files.text('shaders/lensDistortion.glsl'));
    penfx.registerProgram('fog', shading.files.text('shaders/fog.glsl'));
    penfx.extendEngine(require('./lib/acerola.js'));
    penfx.extendEngine(require('./lib/engine.js'));
    penfx.extendPenFX(require('./lib/penfx.js'));
    penfx.registerBlocks(shading.files.json('penfx-blocks.json'), {
        // Menus keep the names of the former built-in package so saved projects resolve them.
        menuNamespace: 'penfx-builtins',
        order: 240,
        translations: {ja: shading.files.json('locales/ja.json')},
        legacyMenus: {
            frameShape: ["rectangle", "circle"],
            sampleMode: ["clamp", "mirror", "wrap", "border"],
            fogType: ["linear", "smooth", "exponential", "exponential squared"]
        }
    });
};
