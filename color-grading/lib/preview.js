'use strict';

const {colorGradingUniforms} = require('./uniforms.js');

// Renders look thumbnails with the same shader and uniforms as the block, on a private WebGL context so the
// stage renderer's state is never touched by the picker.

const compile = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(message || 'Could not compile the color grading preview shader.');
    }
    return shader;
};

const setUniform = (gl, location, value) => {
    if (!location) return;
    if (Array.isArray(value)) {
        if (value.length === 2) gl.uniform2fv(location, value);
        else if (value.length === 3) gl.uniform3fv(location, value);
        else if (value.length === 4) gl.uniform4fv(location, value);
    } else {
        gl.uniform1f(location, value);
    }
};

class ColorGradingPreviewRenderer {
    constructor (vertexShader, colorGradingShader) {
        this.canvas = document.createElement('canvas');
        const options = {alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false};
        const gl = this.canvas.getContext('webgl', options) || this.canvas.getContext('experimental-webgl', options);
        if (!gl) throw new Error('WebGL is not available for color grading previews.');
        this.gl = gl;
        const program = gl.createProgram();
        const vertex = compile(gl, gl.VERTEX_SHADER, vertexShader);
        const fragment = compile(gl, gl.FRAGMENT_SHADER, colorGradingShader);
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(program) || 'Could not link the color grading preview shader.');
        }
        this.program = program;
        this.locations = new Map();
        this.uniforms = new Map();
        this.quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        this.texture = gl.createTexture();
        this.snapshot = null;
    }

    _location (name) {
        if (!this.locations.has(name)) this.locations.set(name, this.gl.getUniformLocation(this.program, name));
        return this.locations.get(name);
    }

    setSnapshot (snapshot) {
        const gl = this.gl;
        this.snapshot = snapshot;
        this.canvas.width = snapshot.width;
        this.canvas.height = snapshot.height;
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, snapshot.width, snapshot.height, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            snapshot.pixels);
    }

    // Draws the preset into the target canvas. `null` draws the ungraded input.
    draw (preset, targetCanvas, mix = 1) {
        if (!this.snapshot) return;
        const gl = this.gl;
        if (!this.uniforms.has(preset ? preset.id : '')) {
            this.uniforms.set(preset ? preset.id : '', colorGradingUniforms(preset || {}));
        }
        const uniforms = this.uniforms.get(preset ? preset.id : '');
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);
        const position = gl.getAttribLocation(this.program, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this._location('u_image'), 0);
        for (const name of Object.keys(uniforms)) setUniform(gl, this._location(name), uniforms[name]);
        setUniform(gl, this._location('u_resolution'), [this.canvas.width, this.canvas.height]);
        setUniform(gl, this._location('u_time'), 0);
        setUniform(gl, this._location('u_mix'), preset ? mix : 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (targetCanvas.width !== this.canvas.width || targetCanvas.height !== this.canvas.height) {
            targetCanvas.width = this.canvas.width;
            targetCanvas.height = this.canvas.height;
        }
        const context = targetCanvas.getContext('2d');
        context.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        // Snapshot rows are top-down but WebGL presents row 0 at the bottom, so flip back to stage orientation.
        context.save();
        context.translate(0, targetCanvas.height);
        context.scale(1, -1);
        context.drawImage(this.canvas, 0, 0);
        context.restore();
    }

    dispose () {
        const gl = this.gl;
        gl.deleteTexture(this.texture);
        gl.deleteBuffer(this.quad);
        gl.deleteProgram(this.program);
        const lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
    }
}


module.exports = {ColorGradingPreviewRenderer};
