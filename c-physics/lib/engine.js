'use strict';

const {createShatter} = require('./shatter.js');

// Installed on every PenFX engine. Runs inside the group the physic block draws its substack into: reads the group,
// splits it into pieces and writes the pieces back at their simulated poses (like the blob effect reads and rewrites
// its frame).
const install = ({Engine}) => {
    Engine.prototype.cPhysics = function (options, blendMode) {
        const gl = this.gl;
        if (this.blendOpacity <= 0) return;
        const skin = this._prepare();
        if (!skin) return;
        const width = this.width;
        const height = this.height;
        const length = width * height * 4;
        if (!this.cPhysicsSource || this.cPhysicsSource.length !== length) {
            this.cPhysicsSource = new Uint8Array(length);
            this.cPhysicsOutput = new Uint8Array(length);
        }
        if (!this.cPhysicsShatter) this.cPhysicsShatter = createShatter();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[0]);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, this.cPhysicsSource);
        const frame = {data: this.cPhysicsSource, width, height};
        const output = this.cPhysicsShatter.render(frame, Object.assign({}, options, {
            pixelScale: this.pixelScale || 1
        }), this.cPhysicsOutput);
        const direct = this._canRenderDirectly(blendMode);
        if (!direct) this._ensureSecondaryBuffer();
        gl.bindTexture(gl.TEXTURE_2D, direct ? skin._texture : this.textures[1]);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, output);
        if (direct) this._markSkinChanged(skin);
        else this._finish(skin, this.textures[1], blendMode);
    };
};

module.exports = install;
