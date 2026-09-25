'use strict';

// Decoded shader sources, the ReShade FX compiler and textures are shared independently of per-engine render
// targets. Everything comes from the plugin archive: nothing is fetched from a server and no <script> is injected.
const shading = require('shading');

let pending = null;
let resources = null;
let loadError = null;

// Shaders disagree on letter case (Cursor.png / cursor.png), so map each `source` annotation onto the file name
// listed in textures.json.
const resolveGenshadeTexture = (files, name) => {
    const path = name.split(/[\\/]/).join('/');
    if (files.includes(path)) return path;
    const folded = path.toLowerCase();
    return files.find(file => file.toLowerCase() === folded) || path;
};

const loadImage = url => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load Genshade texture: ${url}`));
    image.src = url;
});

const loadGenshade = () => {
    if (pending) return pending;
    if (typeof document === 'undefined') return Promise.resolve(null);
    pending = (async () => {
        const modules = shading.files.json('assets/modules.json');
        const sources = shading.files.json('assets/sources.json');
        const textureFiles = shading.files.json('assets/textures.json');
        // The Emscripten build supports CommonJS, so it loads through the plugin's module system and receives the
        // WebAssembly binary directly.
        const createGenshadeCompiler = require('../assets/compiler.js');
        let diagnostics = [];
        const compiler = await createGenshadeCompiler({
            wasmBinary: shading.files.bytes('assets/compiler.wasm'),
            locateFile: name => shading.files.url(`assets/${name}`),
            printErr: message => diagnostics.push(message),
            noInitialRun: true
        });
        compiler.FS.mkdir('/shaders');
        Object.entries(sources).forEach(([name, source]) => {
            const parts = name.split('/');
            let directory = '/shaders';
            parts.slice(0, -1).forEach(part => {
                directory += `/${part}`;
                try {
                    compiler.FS.mkdir(directory);
                } catch (error) {
                    // Shared directory already exists.
                }
            });
            compiler.FS.writeFile(`/shaders/${name}`, source);
        });
        const images = new Map();
        // A missing texture only disables the effects that sample it, not the whole catalog.
        const imageErrors = new Map();
        const names = new Set(Object.values(modules).flatMap(module => module.textures
            .map(texture => texture.annotations.source).filter(Boolean)));
        await Promise.all(Array.from(names, async name => {
            try {
                const file = `assets/Textures/${resolveGenshadeTexture(textureFiles, name)}`;
                if (!shading.files.has(file)) throw new Error(`Missing Genshade texture: ${name}`);
                images.set(name, await loadImage(shading.files.url(file)));
            } catch (error) {
                imageErrors.set(name, error);
                shading.error(error.message);
            }
        }));
        resources = {
            modules,
            images,
            imageErrors,
            compile (file, width, height) {
                diagnostics = [];
                const result = compiler.callMain([`/shaders/${file}`, '/shaders', '/effect.json',
                    String(width), String(height)]);
                if (result) throw new Error(diagnostics.join('\n') || `Could not compile ${file}`);
                return JSON.parse(compiler.FS.readFile('/effect.json', {encoding: 'utf8'}));
            }
        };
        return resources;
    })().catch(error => {
        loadError = error;
        pending = null; // Permit an explicit retry after a transient asset failure.
        throw error;
    });
    return pending;
};

const getGenshade = () => {
    if (!resources) throw loadError || new Error('Genshade assets are still loading.');
    return resources;
};

module.exports = {getGenshade, loadGenshade, resolveGenshadeTexture};
