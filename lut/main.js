'use strict';

const {PenFXLUTManager} = require('./lib/luts.js');
const createInstaller = require('./lib/penfx.js');
const {createLUTTab} = require('./lib/lut-tab.js');

const PROJECT_KEY = 'penFXLUTs';

// LUT: the LUT block, a LUT tab for managing PNG lookup tables, and the project data that stores them. The block,
// its menu and the project key keep the names they had when LUTs were built into shading.app.
exports.activate = shading => {
    const penfx = shading.penfx;
    const {localize, getLocale} = shading.l10n;
    const manager = new PenFXLUTManager(shading.vm);
    // Other plugins (and tests) can reach the project's LUTs through shading.plugins.getExports('lut').
    exports.lutManager = manager;

    penfx.registerProgram('lut', shading.files.text('shaders/lut.glsl'));
    penfx.extendEngine(require('./lib/engine.js'));
    penfx.extendPenFX(createInstaller(manager, () => localize(getLocale(), 'Import a LUT in the LUT tab',
        'LUTタブで画像を追加')));
    penfx.registerBlocks(shading.files.json('penfx-blocks.json'), {
        // Menus keep the names of the former built-in package so saved projects resolve them.
        menuNamespace: 'penfx-builtins',
        order: 110,
        translations: {ja: shading.files.json('locales/ja.json')},
        menus: {lutAssets: {acceptReporters: true, items: 'getLUTMenu'}}
    });

    // Decoding and GPU upload happen while the project loads, so the block never waits for an image.
    shading.project.registerData(PROJECT_KEY, {
        serialize: () => (manager.items.length ? manager.serialize() : undefined),
        deserialize: data => manager.restore(data)
    });
    shading.onDispose(() => manager.items.forEach(item => manager.release(item)));

    // The tab needs the editor's React components; without the editor (e.g. a headless VM) only the block runs.
    if (!shading.gui.react) return;
    const {React, components, icons, downloadBlob} = shading.gui.react;
    shading.gui.addStyle(shading.files.text('lib/lut-tab.css'));
    shading.gui.addTab({
        id: 'luts',
        label: 'LUT',
        icon: shading.files.url('icon.svg'),
        component: createLUTTab({
            React,
            AssetPanel: components.AssetPanel,
            fileUploadIcon: icons.fileUpload,
            downloadBlob,
            manager,
            localize
        })
    });
};
