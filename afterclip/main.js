'use strict';

// AfterClip: PenFX effects ported from Zoidium (plugins/afterclip).
// シェーダー作者: AfterClip。Zoidium 版の正規化: rbstxt (1zworks)。
exports.activate = shading => {
    const penfx = shading.penfx;
    penfx.registerBlocks(shading.files.json('penfx-blocks.json'), {
        order: 410,
        label: 'AfterClip',
        translations: {ja: shading.files.json('locales/ja.json')}
    });
};
