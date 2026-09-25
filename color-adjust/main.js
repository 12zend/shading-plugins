'use strict';

const {DEFAULT_GRADIENT, createGradientField} = require('./lib/gradient-field.js');

// Color Adjust: PenFX effect blocks for shading.app. Block ids and menus keep the names they had when these
// effects were built into the app, so existing projects load unchanged once the plugin is installed.
exports.activate = shading => {
    const penfx = shading.penfx;
    penfx.registerProgram('color', shading.files.text('shaders/color.glsl'), {boundsPadding: () => 1});
    penfx.registerProgram('colorOverlay', shading.files.text('shaders/colorOverlay.glsl'), {boundsPadding: () => 1});
    penfx.registerProgram('gradationOverlay', shading.files.text('shaders/gradationOverlay.glsl'));
    penfx.registerProgram('acerolaColor', shading.files.text('shaders/acerolaColor.glsl'), {
        boundsPadding: uniforms => (uniforms.u_mode === 10 ? null : 1)
    });
    penfx.extendEngine(require('./lib/acerola.js'));
    penfx.extendEngine(require('./lib/engine.js'));
    penfx.extendPenFX(require('./lib/penfx.js'));
    penfx.registerBlocks(shading.files.json('penfx-blocks.json'), {
        // Menus keep the names of the former built-in package so saved projects resolve them.
        menuNamespace: 'penfx-builtins',
        order: 100,
        translations: {ja: shading.files.json('locales/ja.json')},
        legacyMenus: {
            colorBlindType: ["deuteranopia", "protanopia", "tritanopia"],
            toneMapType: ["clamp", "aces hill", "aces", "reinhard"],
            chromaBehavior: ["solid", "gradient", "transparent"],
            rgbPair: ["RG", "GB", "BR"]
        }
    });

    // The gradation overlay block edits its stops in a custom drop-down instead of a text input.
    shading.gui.addStyle(shading.files.text('lib/gradient-field.css'));
    shading.blocks.define('penfx', (ScratchBlocks, context) => {
        const GradientField = createGradientField(ScratchBlocks);
        const {localize} = shading.l10n;
        const locale = context.locale;
        ScratchBlocks.Blocks.penfx_gradationOverlay = {
            init: function () {
                this.appendDummyInput('GRADIENT_INPUT')
                    .appendField(localize(locale, 'gradation overlay', 'グラデーションオーバーレイ'))
                    .appendField(new GradientField(), 'GRADIENT');
                this.appendValueInput('DIR').appendField(localize(locale, 'dir:', '向き:'));
                this.appendValueInput('MIX')
                    .appendField(localize(locale, 'mix:', '混合:'))
                    .appendField('%');
                this.setInputsInline(true);
                this.setColour('#6b56d9', '#5945c2', '#46359f');
                this.setPreviousStatement(true);
                this.setNextStatement(true);
                this.setOutputShape(ScratchBlocks.OUTPUT_SHAPE_SQUARE);
            }
        };
    });
    const escapeXML = text => String(text).replace(/[<>&'"]/g, character => (
        {'<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'}[character]
    ));
    shading.blocks.filterToolboxXML('penfx', xml => xml.replace(
        /<block type="penfx_gradationOverlay"(?:\/>|>[\s\S]*?<\/block>)/,
        `<block type="penfx_gradationOverlay">
            <field name="GRADIENT">${escapeXML(JSON.stringify(DEFAULT_GRADIENT))}</field>
            <value name="DIR"><shadow type="math_angle"><field name="NUM">90</field></shadow></value>
            <value name="MIX"><shadow type="math_number"><field name="NUM">100</field></shadow></value>
        </block>`
    ));
};
