/* eslint-disable */
'use strict';

const shading = require('shading');
const { color, mixAmount, number, numberOr } = shading.penfx.helpers;

// Time of the block in seconds (local time, motion blur samples, ...). Used for Panzoid's `time` expressions.
const timeOf = util => {
  try {
    const time = Number(shading.objects.getTime(util));
    return Number.isFinite(time) ? time : 0;
  } catch (error) {
    return 0;
  }
};

// A pass of a converted Zoidium shader. Panzoid property names get the PenFX `u_` prefix.
const shaderPass = (program, properties = {}, integers = []) => {
  const uniforms = {};
  for (const name of Object.keys(properties)) uniforms[`u_${name}`] = properties[name];
  return { program, uniforms, integerUniforms: integers.map(name => `u_${name}`) };
};

// Panzoid built-in "Duplicate". rotation is in radians, like Panzoid's own setting.
const duplicatePass = ({ offset = [0, 0], multiplier = [1, 1], rotation = 0, repeat = 1 }) => ({
  program: 'afterclipBuiltinDuplicate',
  uniforms: { u_offset: offset, u_multiplier: multiplier, u_rotation: rotation, u_repeat: repeat ? 1 : 0 },
  integerUniforms: ['u_repeat']
});

// Panzoid built-in "Flip".
const flipPass = (horizontal, vertical) => ({
  program: 'afterclipBuiltinFlip',
  uniforms: { u_horizontal: horizontal ? 1 : 0, u_vertical: vertical ? 1 : 0 },
  integerUniforms: ['u_horizontal', 'u_vertical']
});

// Panzoid built-in "Antialiasing" (FXAA).
const fxaaPass = () => ({ program: 'afterclipBuiltinFxaa', uniforms: {}, integerUniforms: [] });

// Panzoid built-in shape "Mask" (mode 0 rectangle, 1 ellipse; position/size in 1080p project pixels).
const maskPass = ({ mode = 1, position = [0, 0], size = [100, 100], rotation = 0, invert = 0, feather = 0, opacity = 1 }) => ({
  program: 'afterclipBuiltinMask',
  uniforms: {
    u_mode: mode, u_position: position, u_size: size, u_rotation: rotation, u_invert: invert ? 1 : 0,
    u_feather: feather, u_opacity: opacity
  },
  integerUniforms: ['u_mode', 'u_invert']
});

// Panzoid built-in "Brightness + Contrast".
const brightnessContrastPass = ({ brightness = 0, contrast = 1 }) => ({
  program: 'afterclipBuiltinBrightnessContrast',
  uniforms: { u_brightness: brightness, u_contrast: contrast },
  integerUniforms: []
});

// Panzoid built-in "Luma Key".
const lumaKeyPass = ({ threshold = 0.5, soften = 0, invert = 0, mask = 0 }) => ({
  program: 'afterclipBuiltinLumaKey',
  uniforms: { u_threshold: threshold, u_soften: soften, u_invert: invert ? 1 : 0, u_mask: mask ? 1 : 0 },
  integerUniforms: ['u_invert', 'u_mask']
});

// Panzoid built-in "Color Grading".
const colorGradingPass = ({ shadows = [1, 1, 1], midtones = [1, 1, 1], highlights = [1, 1, 1] }) => ({
  program: 'afterclipBuiltinColorGrading',
  uniforms: { u_shadows: shadows, u_midtones: midtones, u_highlights: highlights },
  integerUniforms: []
});

// Panzoid built-in "Radial Blur".
const radialBlurPass = ({ density = 0, dither = 0, decay = 1, center = [0, 0], overbright = 1, weight = 1 }) => ({
  program: 'afterclipBuiltinRadialBlur',
  uniforms: {
    u_density: density, u_dither: dither, u_decay: decay, u_center: center, u_overbright: overbright ? 1 : 0,
    u_weight: weight
  },
  integerUniforms: ['u_overbright']
});

// Panzoid expression `(1-pow(1-t,power)*(t<1))*(0<t)*scale` with t = (time - start) / length: an ease-out
// from 0 to scale that starts at `start`.
const easeOutFrom = (time, start, length, power, scale) => {
  const t = (time - start) / length;
  if (!(t > 0)) return 0;
  if (!(t < 1)) return Number.isFinite(scale) ? scale : 0;
  const value = (1 - Math.pow(1 - t, power)) * scale;
  return Number.isFinite(value) ? value : 0;
};

const DOTWAVE_WARP = {
  Opacity: 1, Scale: [1, 1], Rotation: 0, Position: [0, 0], GridSize: 10, BoxScaleMin: 0, BoxScaleMax: 0.95,
  Color: [1, 1, 1]
};

// Each group preset returns its chain of passes (Zoidium order, first pass first) for the block's inputs.
const GROUPS = {
  afterclipGroupDotWavesCircularDotwave: (args, time) => [
  shaderPass('afterclipGroupGroupDotWavesCircularDotwaveGrayscaleGradient', { Power: 2 }),
  duplicatePass({ offset: [-time, 0], multiplier: [5.23, 1], rotation: Math.PI / 2, repeat: 1 }),
  shaderPass('afterclipGroupWarpPolarCoordinates'),
  shaderPass('afterclipGroupGroupDotWavesCircularDotwaveDotwaveWarp', DOTWAVE_WARP)],

  // v = time * 0.4 (Panzoid expression of the hidden property v).
  afterclipGroupDotWavesHexDotwave: (args, time) => [
  shaderPass('afterclipGroupGroupDotWavesCircularDotwaveGrayscaleGradient', { Power: 2 }),
  duplicatePass({ offset: [0, 0], multiplier: [3, 3], rotation: 0, repeat: 1 }),
  duplicatePass({ offset: [-time * 0.4, 0], multiplier: [2, 1], rotation: 0, repeat: 1 }),
  shaderPass('afterclipGroupWarpMirrorFixedBugs', { Segments: numberOr(args.N, 6) }),
  shaderPass('afterclipGroupRepeatHexDotWave', {
    Opacity: 1, Scale: [1, 1], Rotation: 0, Position: [0, 0], GridSize: 12, BoxScaleMin: 0, BoxScaleMax: 0.9,
    Color: [1, 1, 1]
  })],

  afterclipGroupDotWavesSquareDotwave: (args, time) => [
  shaderPass('afterclipGroupGroupDotWavesCircularDotwaveGrayscaleGradient', { Power: 2 }),
  duplicatePass({ offset: [-time, 0], multiplier: [5.23, 1], rotation: 0, repeat: 1 }),
  shaderPass('afterclipGroupWarpMirrorFixedBugs', { Segments: 4 }),
  duplicatePass({ offset: [0, 0], multiplier: [0.88, 0.88], rotation: 0, repeat: 0 }),
  shaderPass('afterclipGroupGroupDotWavesCircularDotwaveDotwaveWarp', DOTWAVE_WARP)],

  // Eight nested "Arrow" groups (Start = Delay * i, Rotation = 22.5 * i, Color1/Color2 alternating), then
  // Radial Repeat, Flip and Antialiasing.
  afterclipGroupEffectsArrow: (args, time) => {
    const start = numberOr(args.START, 0);
    const delay = numberOr(args.DELAY, 0.07);
    const scale = numberOr(args.SCALE, 1.14);
    const length = numberOr(args.LENGTH, 0.7);
    const colors = [color(args.COLOR1 === undefined ? '#006cff' : args.COLOR1),
    color(args.COLOR2 === undefined ? '#ffffff' : args.COLOR2)];
    const passes = [];
    for (let i = 0; i < 8; i++) {
      const arrowStart = delay * i + start;
      passes.push(shaderPass('afterclipGroupShapeArrow', {
        Opacity: 1, Scale: [1, 1], Rotation: 0, Radius: 5, Radius2: 6, Angle: 22.5, PatternRotation: 22.5 * i,
        OutSize: easeOutFrom(time, arrowStart, length, 4, scale),
        InSize: easeOutFrom(time, arrowStart + 0.2, length, 3, scale),
        Position: [0, 0], Color: colors[i % 2]
      }));
    }
    passes.push(shaderPass('afterclipGroupRepeatRadialRepeat', { Repeat: 2, Wide: 180, BlendOrder: 1 }, ['BlendOrder']));
    passes.push(flipPass(true, false));
    passes.push(fxaaPass());
    return passes;
  },

  // Width, Angle and Margin are outer properties of the Zoidium group that no node references; the block
  // keeps them as inputs (like Zoidium) but they do not change the image.
  afterclipGroupEffectsBurst: (args, time) => {
    const start = numberOr(args.START, 0);
    const scale = numberOr(args.SCALE, 1);
    const length = numberOr(args.LENGTH, 1);
    const triangle = { P1: [0, 0], P2: [300, 0], P3: [500, -183.48] };
    return [
    shaderPass('afterclipGroupShapeTriangle', Object.assign({
      Opacity: 1, Scale: [1, 1], Rotation: 0, Position: [0, 0],
      Color: color(args.COLOR === undefined ? '#ffffff' : args.COLOR),
      GeometryScale: easeOutFrom(time, start, length, 5, scale)
    }, triangle)),
    shaderPass('afterclipGroupGroupEffectsBurstTriangleMask', Object.assign({
      GeometryScale: easeOutFrom(time, start + 0.2, length, 3, scale)
    }, triangle)),
    shaderPass('afterclipGroupRepeatRadialRepeat', { Repeat: 18, Wide: 20, BlendOrder: 1 }, ['BlendOrder'])];

  },

  afterclipGroupEffectsFractalBurst: () => [
  shaderPass('afterclipGroupWarpFractalNoise', {
    NoisePosition: [0, 0], NoiseScale: [15.56, 0.36], Step: 0, Complexity: 9.96, Strength: 0, Angle: 14.02,
    AngleNoise: 0.5, StartColor: [1, 1, 1], EndColor: [0, 0, 0]
  }, ['Step']),
  shaderPass('afterclipGroupWarpPolarCoordinates'),
  maskPass({ mode: 1, position: [0, 0], size: [540, 540], rotation: 0, invert: 0, feather: 0.83, opacity: 1 }),
  maskPass({ mode: 1, position: [0, 0], size: [200, 200], rotation: 0, invert: 1, feather: 1, opacity: 1 }),
  brightnessContrastPass({ brightness: 0, contrast: 4 }),
  lumaKeyPass({ threshold: 0.521, soften: 0.1, invert: 0, mask: 0 }),
  colorGradingPass({ shadows: [1, 1, 1], midtones: [1, 1, 1], highlights: [1, 0.514, 0.514] }),
  radialBlurPass({ density: 0, dither: 0.5, decay: 0.9, center: [0, 0], overbright: 1, weight: 0.095 })],

  afterclipGroupEffectsFw: () => {
    const line = (lineColor, patternRotation) => shaderPass('afterclipGroupGroupEffectsFwLine', {
      Opacity: 1, Scale: [1, 1], Rotation: 0, Position: [0, 0], P1: [0, 0], P2: [0, 0], Width: 1.3,
      Color: lineColor, Stroke: 0, PatternRotation: patternRotation
    }, ['Stroke']);
    return [
    line([1, 0, 0.666666666666667], 0),
    line([0, 0.6666666666666665, 1], 30),
    line([1, 1, 1], 60),
    shaderPass('afterclipGroupRepeatRadialRepeat', { Repeat: 4, Wide: 90, BlendOrder: 1 }, ['BlendOrder'])];

  }

};

// The host passes a recording prototype and installs these methods on every PenFX instance.
const install = ({ PenFX }) => {
  for (const opcode of Object.keys(GROUPS)) {
    const build = GROUPS[opcode];
    PenFX.prototype[opcode] = function (args, util) {
      const time = timeOf(util);
      const passes = build(args || {}, time);
      this._safe((engine) => engine.afterclipChain(passes, time, mixAmount(args && args.MIX), this.blendMode));
    };
  }
};

module.exports = install;
module.exports.GROUPS = GROUPS;
