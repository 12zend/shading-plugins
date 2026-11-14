'use strict';

// AfterClip: PenFX effects ported from Zoidium (plugins/afterclip).
// シェーダー作者: AfterClip。Zoidium 版の正規化: rbstxt (1zworks)。

// Programs of the group presets (lib/penfx.js): converted Zoidium shaders, then Panzoid built-in effects.
const GROUP_PROGRAMS = {
    afterclipGroupGroupDotWavesCircularDotwaveGrayscaleGradient:
        'shaders/groups/afterclip-group-dot-waves-circular-dotwave-grayscale-gradient.glsl',
    afterclipGroupWarpPolarCoordinates: 'shaders/groups/afterclip-warp-polar-coordinates.glsl',
    afterclipGroupGroupDotWavesCircularDotwaveDotwaveWarp:
        'shaders/groups/afterclip-group-dot-waves-circular-dotwave-dotwave-warp.glsl',
    afterclipGroupWarpMirrorFixedBugs: 'shaders/groups/afterclip-warp-mirror-fixed-bugs.glsl',
    afterclipGroupRepeatHexDotWave: 'shaders/groups/afterclip-repeat-hex-dot-wave.glsl',
    afterclipBuiltinDuplicate: 'shaders/builtins/duplicate.glsl'
};

exports.activate = shading => {
    const penfx = shading.penfx;
    for (const name of Object.keys(GROUP_PROGRAMS)) {
        penfx.registerProgram(name, shading.files.text(GROUP_PROGRAMS[name]));
    }
    penfx.registerProgram('afterclipMix', shading.files.text('shaders/afterclip-mix.glsl'));
    // The group presets' work buffers match the pen layer size, so they are dropped whenever the stage is resized.
    penfx.extendEngine(require('./lib/engine.js'), {onResize: engine => engine.afterclipClearScratch()});
    penfx.extendPenFX(require('./lib/penfx.js'));
    penfx.registerBlocks(shading.files.json('penfx-blocks.json'), {
        order: 410,
        label: 'AfterClip',
        translations: {ja: shading.files.json('locales/ja.json')}
    });
};
