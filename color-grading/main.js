'use strict';

const {CATEGORIES, PRESETS} = require('./lib/presets.js');
const {ColorGradingPreviewRenderer} = require('./lib/preview.js');

const MENU = 'colorGradingPresets';

// Color Grading: the manual grade block and one-click film looks. Block ids and menus keep the names they had when
// these effects were built into shading.app, so existing projects load unchanged once the plugin is installed.
exports.activate = shading => {
    const penfx = shading.penfx;
    const {localize} = shading.l10n;
    const {ArgumentType, BlockType} = shading.scratch;

    penfx.registerProgram('acerolaColor', shading.files.text('shaders/acerolaColor.glsl'), {
        boundsPadding: uniforms => (uniforms.u_mode === 10 ? null : 1)
    });
    penfx.registerProgram('colorGrading', shading.files.text('shaders/colorGrading.glsl'));
    penfx.extendEngine(require('./lib/acerola.js'));
    penfx.extendEngine(require('./lib/engine.js'));
    penfx.extendPenFX(require('./lib/penfx.js'));

    penfx.registerBlocks(shading.files.json('penfx-blocks.json'), {
        // Menus keep the names of the former built-in package so saved projects resolve them.
        menuNamespace: 'penfx-builtins',
        order: 120,
        translations: {ja: shading.files.json('locales/ja.json')},
        before: locale => [{
            opcode: 'easyColorGrading',
            func: 'easyColorGrading',
            blockType: BlockType.COMMAND,
            text: localize(locale, 'color grading [PRESET] mix: [MIX] %', 'カラーグレーディング [PRESET] 混合: [MIX] %'),
            arguments: {
                PRESET: {type: ArgumentType.STRING, menu: MENU, defaultValue: PRESETS[0].id},
                MIX: {type: ArgumentType.NUMBER, defaultValue: 100}
            }
        }],
        menus: {
            [MENU]: {acceptReporters: true, items: PRESETS.map(preset => ({text: preset.name, value: preset.id}))}
        }
    });

    // The preset menu opens a searchable thumbnail grid that previews each look on the block's own input.
    let renderer = null;
    const pickerSource = locale => ({
        label: localize(locale, 'Color grading presets', 'カラーグレーディングのプリセット'),
        categories: CATEGORIES.map(category => ({id: category.id, name: category.name})),
        presets: PRESETS.map(preset => ({id: preset.id, name: preset.name, category: preset.category, preset})),
        thumbnailsPerFrame: 16,
        getRenderer: () => {
            if (!renderer) {
                renderer = new ColorGradingPreviewRenderer(penfx.vertexShader,
                    shading.files.text('shaders/colorGrading.glsl'));
            }
            return renderer;
        },
        drawThumbnail: (previewRenderer, entry, canvas) => previewRenderer.draw(entry.preset, canvas)
    });
    shading.blocks.define('penfx', (ScratchBlocks, context) => {
        shading.ui.definePresetMenuBlock(ScratchBlocks, {
            extensionId: 'penfx',
            menu: MENU,
            source: () => pickerSource(context.locale)
        });
    });
    shading.onDispose(() => {
        if (renderer) renderer.dispose();
        renderer = null;
    });
};
