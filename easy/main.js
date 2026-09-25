'use strict';

const {easyBlocks} = require('./lib/presets.js');

// Easy: one-click looks built from the other effect plugins (Glow, Blur, Lens & Frame, Stylize, Film & Retro,
// Distort, Pixel Sort, Color Adjust and Genshade). A look skips the steps whose plugin is not installed.
exports.activate = shading => {
    const penfx = shading.penfx;
    const {localize} = shading.l10n;
    const {ArgumentType, BlockType} = shading.scratch;
    const presetName = (preset, locale) => localize(locale, preset.name, preset.ja);

    penfx.extendPenFX(require('./lib/penfx.js'));
    penfx.addToolbox({
        id: 'easy',
        order: 50,
        label: {en: 'Easy', ja: 'かんたん'},
        blocks: locale => easyBlocks.map(block => ({
            opcode: block.opcode,
            func: block.opcode,
            blockType: BlockType.COMMAND,
            text: localize(locale, block.text[0], block.text[1]),
            arguments: {
                PRESET: {type: ArgumentType.STRING, menu: block.menu, defaultValue: block.presets[0].id},
                MIX: {type: ArgumentType.NUMBER, defaultValue: 100}
            }
        })),
        menus: locale => {
            const menus = {};
            for (const block of easyBlocks) {
                menus[block.menu] = {
                    acceptReporters: true,
                    items: block.presets.map(preset => ({text: presetName(preset, locale), value: preset.id}))
                };
            }
            return menus;
        }
    });

    // Thumbnails run the real blocks on a sandbox engine, so every installed plugin's effect is previewed exactly.
    let renderer = null;
    const pickerSource = (block, locale) => ({
        label: localize(locale, 'Effect presets', 'エフェクトのプリセット'),
        categories: block.categories.map(category => ({id: category.id, name: localize(locale, category.name, category.ja)})),
        presets: block.presets.map(preset => ({
            id: preset.id,
            name: presetName(preset, locale),
            category: preset.category,
            keywords: `${preset.name} ${preset.ja}`,
            preset
        })),
        // Effect recipes can run several passes, and a Genshade effect compiles its shaders on first use, so each
        // animation frame draws thumbnails only until its time budget is spent.
        thumbnailsPerFrame: 8,
        frameBudgetMs: 12,
        getRenderer: () => {
            if (!renderer) renderer = penfx.createPreviewRenderer();
            return renderer;
        },
        // Genshade loads its shaders in the background; wait for it so the first thumbnails are not ungraded.
        ready: () => shading.plugins.whenReady('genshade'),
        drawThumbnail: (previewRenderer, entry, canvas) => previewRenderer.draw(
            penFX => penFX.runEasyPreset(block.opcode, entry.preset.id, 1, null),
            canvas
        )
    });
    shading.blocks.define('penfx', (ScratchBlocks, context) => {
        for (const block of easyBlocks) {
            shading.ui.definePresetMenuBlock(ScratchBlocks, {
                extensionId: 'penfx',
                menu: block.menu,
                source: () => pickerSource(block, context.locale)
            });
        }
    });
    shading.onDispose(() => {
        if (renderer) renderer.dispose();
        renderer = null;
    });
};
