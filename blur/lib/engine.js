/* eslint-disable */
'use strict';

const shading = require('shading');
const lensBlurSource = shading.files.text('shaders/lensBlur.glsl');
const lensBlurKernel = shading.files.text('shaders/lensBlurKernel.glsl');

// The host passes a recording prototype and installs these methods on every PenFX engine.
const install = ({ Engine }) => {
  Engine.prototype._gaussianPass = function (texture, framebuffer, direction, radius, radialType, twoDimensional, center, mixValue) {
    this._render(this._program('gaussian'), framebuffer, [{ name: 'u_image', texture }], {
      u_resolution: this.resolution,
      u_direction: direction,
      u_radius: radius,
      u_radialType: radialType,
      u_twoDimensional: twoDimensional,
      u_center: center,
      u_mix: mixValue
    }, ['u_radialType', 'u_twoDimensional']);
  };

  Engine.prototype.gaussian = function (type, direction, radius, mixValue, blendMode) {
    if (this._isNoOp(mixValue, blendMode)) return;
    const skin = this._prepare();
    if (!skin) return;
    const safeRadius = Math.min(256, Math.max(0, Math.abs(radius)));
    const direct = this._canRenderDirectly(blendMode);
    if (!direct) this._ensureSecondaryBuffer();
    const target = direct ? skin._framebuffer.framebuffer || skin._framebuffer : this.framebuffers[1];
    if (type === 'normal') {
      if (direct && safeRadius > 0.001) {
        this._ensureSecondaryBuffer();
        this._gaussianPass(this.textures[0], this.framebuffers[1], [1, 0], safeRadius, -1, 2, [0, 0], 1);
        this._gaussianPass(this.textures[1], target, [0, 1], safeRadius, -1, 2, [0, 0], mixValue);
      } else {
        this._gaussianPass(this.textures[0], target, [0, 0], safeRadius, -1, 1, [0, 0], mixValue);
      }
    } else {
      const vector = type === 'horizontal' ? [1, 0] : type === 'vertical' ? [0, 1] : [
      Math.sin(direction * Math.PI / 180), Math.cos(direction * Math.PI / 180)];

      this._gaussianPass(this.textures[0], target, vector, safeRadius, -1, 0, [0, 0], mixValue);
    }
    if (direct) this._markSkinChanged(skin);else
    this._finish(skin, this.textures[1], blendMode);
  };

  Engine.prototype.radial = function (type, radius, centerX, centerY, mixValue, blendMode) {
    if (this._isNoOp(mixValue, blendMode)) return;
    const skin = this._prepare();
    if (!skin) return;
    const direct = this._canRenderDirectly(blendMode);
    if (!direct) this._ensureSecondaryBuffer();
    const target = direct ? skin._framebuffer.framebuffer || skin._framebuffer : this.framebuffers[1];
    this._gaussianPass(this.textures[0], target, [0, 0], Math.min(256, Math.max(0, Math.abs(radius))),
    type === 'dir' ? 0 : 1, 0, [centerX, centerY], mixValue);
    if (direct) this._markSkinChanged(skin);else
    this._finish(skin, this.textures[1], blendMode);
  };

  Engine.prototype.lensBlur = function (radius, shape, rotation, mixValue, blendMode) {
    const blades = shape === 'hexagon' ? 6 : shape === 'octagon' ? 8 : 0;
    const safeRadius = Math.min(256, Math.max(0, Math.abs(radius)));
    const key = this.programOverrides && this.programOverrides.lensBlur || 'lensBlur';
    const source = this.programSources[key];
    const gl = this.gl;
    if (this.lensKernelSupported === undefined) {
      this.lensKernelSupported = typeof gl.getParameter === 'function' &&
        gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) >= 40;
    }
    if (this.lensKernelSupported && source.trim() === lensBlurSource.trim()) {
      if (!this.lensKernelProgram) {
        this.lensKernelProgram = this._createProgram(lensBlurKernel);
        // The kernel samples at most the blur radius, so grouped blurs only process the group's bounds.
        this.setProgramBoundsPadding(this.lensKernelProgram, uniforms => Math.ceil(Math.abs(uniforms.u_radius)) + 2);
      }
      const samples = this.lensSamples || (this.lensSamples = new Float32Array(96));
      const rotationRad = rotation * Math.PI / 180;
      const bladesSafe = Math.max(blades, 3);
      const sector = 6.28318530718 / bladesSafe;
      const halfSector = sector * 0.5;
      const polyCos = Math.cos(3.14159265359 / bladesSafe);
      for (let i = 0; i < 32; i++) {
        const fi = i + 0.5;
        const angle = fi * 2.39996322973;
        const delta = angle - rotationRad + halfSector;
        const localAngle = delta - sector * Math.floor(delta / sector) - halfSector;
        const shape = blades >= 3 ? polyCos / Math.max(Math.cos(localAngle), 0.001) : 1;
        const normRadius = Math.sqrt(fi * 0.03125) * shape;
        samples[i * 3] = Math.cos(angle) * normRadius * safeRadius;
        samples[i * 3 + 1] = Math.sin(angle) * normRadius * safeRadius;
        samples[i * 3 + 2] = 1 + normRadius * 0.35;
      }
      this._singlePass(this.lensKernelProgram, {
        u_resolution: this.resolution, u_radius: safeRadius, u_mix: mixValue,
        u_lensSamples: samples
      }, [], blendMode);
      return;
    }
    this._singlePass(this._program('lensBlur'), {
      u_resolution: this.resolution,
      u_radius: Math.min(256, Math.max(0, Math.abs(radius))),
      u_blades: blades,
      u_rotation: rotation,
      u_mix: mixValue
    }, [], blendMode);
  };

  Engine.prototype.depthOfField = function (depthBuffer, focusDistance, focusRange, aperture, maxBlur, nearStrength,
  farStrength, edgeSoftness, shape, rotation, mixValue, blendMode) {
    if (!depthBuffer || this._isNoOp(mixValue, blendMode)) return;
    const skin = this._prepare();
    if (!skin) return;
    const flatDepth = Number(depthBuffer.flatDepth);
    const hasFlatDepth = Number.isFinite(flatDepth) && flatDepth > 0;
    const depthTexture = hasFlatDepth ? this.textures[0] : this._uploadDepthBuffer(depthBuffer);
    if (!depthTexture) return;
    const cameraNear = hasFlatDepth ? 0.1 : Math.max(0.0001, Number(depthBuffer.near) || 0.1);
    const cameraFar = hasFlatDepth ? 1 : Math.max(cameraNear + 0.0001, Number(depthBuffer.far) || 1);
    const blades = shape === 'hexagon' ? 6 : shape === 'octagon' ? 8 : 0;
    this._renderEffect(skin, this._program('depthOfField'), [
    { name: 'u_image', texture: this.textures[0] },
    { name: 'u_depth', texture: depthTexture }],
    {
      u_resolution: this.resolution,
      u_cameraNear: cameraNear,
      u_cameraFar: cameraFar,
      u_flatDepth: hasFlatDepth ? flatDepth : -1,
      u_focusDistance: Math.max(0.0001, focusDistance),
      u_focusRange: Math.max(0, focusRange),
      u_aperture: Math.min(512, Math.max(0, aperture)),
      u_maxBlur: Math.min(128, Math.max(0, maxBlur)),
      u_nearStrength: Math.min(4, Math.max(0, nearStrength)),
      u_farStrength: Math.min(4, Math.max(0, farStrength)),
      u_edgeSoftness: Math.max(0, edgeSoftness),
      u_blades: blades,
      u_rotation: rotation,
      u_mix: mixValue
    }, [], blendMode);
  };
};

module.exports = install;
