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
    afterclipGroupShapeArrow: 'shaders/groups/afterclip-shape-arrow.glsl',
    afterclipGroupRepeatRadialRepeat: 'shaders/groups/afterclip-repeat-radial-repeat.glsl',
    afterclipGroupShapeTriangle: 'shaders/groups/afterclip-shape-triangle.glsl',
    afterclipGroupGroupEffectsBurstTriangleMask: 'shaders/groups/afterclip-group-effects-burst-triangle-mask.glsl',
    afterclipGroupWarpFractalNoise: 'shaders/groups/afterclip-warp-fractal-noise.glsl',
    afterclipGroupGroupEffectsFwLine: 'shaders/groups/afterclip-group-effects-fw-line.glsl',
    afterclipGroupShapeLineWave: 'shaders/groups/afterclip-shape-line-wave.glsl',
    afterclipGroupShapeLineWaveMask: 'shaders/groups/afterclip-shape-line-wave-mask.glsl',
    afterclipBuiltinDuplicate: 'shaders/builtins/duplicate.glsl',
    afterclipBuiltinFlip: 'shaders/builtins/flip.glsl',
    afterclipBuiltinFxaa: 'shaders/builtins/fxaa.glsl',
    afterclipBuiltinMask: 'shaders/builtins/mask.glsl',
    afterclipBuiltinBrightnessContrast: 'shaders/builtins/brightness-contrast.glsl',
    afterclipBuiltinLumaKey: 'shaders/builtins/luma-key.glsl',
    afterclipBuiltinColorGrading: 'shaders/builtins/color-grading.glsl',
    afterclipBuiltinRadialBlur: 'shaders/builtins/radial-blur.glsl'
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
