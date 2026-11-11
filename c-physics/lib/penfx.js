'use strict';

// Installed on every PenFX instance: queues the physic effect like any PenFX effect (in the frame graph while a
// render frame is collected, otherwise right away).
const install = ({PenFX}) => {
    PenFX.prototype.cPhysics = function (options) {
        this._safe(engine => engine.cPhysics(options, this.blendMode));
    };
};

module.exports = install;
