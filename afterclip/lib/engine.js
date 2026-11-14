/* eslint-disable */
'use strict';

const EMPTY_INTEGER_UNIFORMS = [];

// The host passes a recording prototype and installs these methods on every PenFX engine.
const install = ({ Engine }) => {
  // Two work buffers for the multi-pass group presets. They match the pen layer size, so main.js drops them
  // whenever the stage is resized (extendEngine onResize).
  Engine.prototype.afterclipScratch = function () {
    if (!this.afterclipBuffers) this.afterclipBuffers = [this._createBufferTexture(), this._createBufferTexture()];
    return this.afterclipBuffers;
  };

  Engine.prototype.afterclipClearScratch = function () {
    for (const buffer of this.afterclipBuffers || []) {
      this.gl.deleteFramebuffer(buffer.framebuffer);
      this.gl.deleteTexture(buffer.texture);
    }
    this.afterclipBuffers = null;
  };

  // Runs a group preset: every pass reads the previous pass's result (the first reads the block's input,
  // this.textures[0], which is kept for the final mix) and writes the other work buffer.
  // passes: [{program, uniforms, integerUniforms}]. u_resolution and u_time are added to every pass.
  Engine.prototype.afterclipChain = function (passes, time, mixValue, blendMode) {
    if (this._isNoOp(mixValue, blendMode)) return;
    const skin = this._prepare();
    if (!skin) return;
    const buffers = this.afterclipScratch();
    let source = this.textures[0];
    let index = 0;
    for (const pass of passes) {
      const target = buffers[index];
      const uniforms = Object.assign({ u_resolution: this.resolution, u_time: time }, pass.uniforms);
      this._render(this._program(pass.program), target.framebuffer, [{ name: 'u_image', texture: source }],
      uniforms, pass.integerUniforms || EMPTY_INTEGER_UNIFORMS);
      source = target.texture;
      index = 1 - index;
    }
    this._renderEffect(skin, this._program('afterclipMix'), [
    { name: 'u_image', texture: this.textures[0] },
    { name: 'u_effect', texture: source }],
    { u_mix: mixValue }, EMPTY_INTEGER_UNIFORMS, blendMode);
  };
};

module.exports = install;
