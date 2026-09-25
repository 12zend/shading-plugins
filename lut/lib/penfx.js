'use strict';

const {mixAmount} = require('shading').penfx.helpers;

// The host passes a recording prototype and installs these methods on every PenFX instance.
const createInstaller = (manager, menuPlaceholder) => ({PenFX}) => {
    PenFX.prototype.applyLUT = function (args) {
        const entry = manager.find(args.LUT);
        if (!entry) return;
        const amount = mixAmount(args.MIX);
        this._safe(engine => engine.lut(entry, amount, this.blendMode));
    };

    // Dynamic menu: the LUT names in the project; the stored value is the LUT id, so renaming keeps blocks working.
    PenFX.prototype.getLUTMenu = function () {
        return manager.items.length ? manager.items.map(item => ({text: item.name, value: item.id})) :
            [{text: menuPlaceholder(), value: ''}];
    };
};

module.exports = createInstaller;
