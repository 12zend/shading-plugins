'use strict';

const {blocks, install} = require('./lib/blocks.js');
const {loadGenshade} = require('./lib/assets.js');

// Genshade: ReShade FX effects compiled to WebGL. Every technique becomes a Looks block whose id matches the one it
// had when Genshade was built into shading.app. The compiler and textures load in the background; the blocks draw
// nothing until they are ready, and projects wait for them before loading.
exports.activate = shading => {
    const penfx = shading.penfx;
    penfx.extendPenFX(install);
    penfx.registerBlocks({
        format: 'shading.app/penfx-shader',
        version: 2,
        id: 'genshade',
        name: 'Genshade / ReShade',
        blocks
    }, {order: 900, label: 'Genshade / ReShade'});

    const clearCompiledEffects = () => {
        const engine = shading.runtime.penFX && shading.runtime.penFX.engine;
        if (engine && engine.genshadeRenderer) engine.genshadeRenderer.clear();
    };
    // Effects compiled for the previous project's stage size are rebuilt on demand.
    shading.project.onLoad(clearCompiledEffects);
    shading.onDispose(() => {
        clearCompiledEffects();
        const engine = shading.runtime.penFX && shading.runtime.penFX.engine;
        if (engine) delete engine.genshadeRenderer;
    });

    const ready = loadGenshade().catch(error => {
        shading.error('Could not load effects:', error);
    });
    shading.runWithoutWaiting(ready);
    return ready;
};
