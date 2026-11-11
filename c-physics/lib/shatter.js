'use strict';

const {extractPieces, hashFrame} = require('./pieces.js');
const {Simulation} = require('./solver.js');
const {drawPieces} = require('./raster.js');

const MAX_ENTRIES = 16;

const settingsKey = options => JSON.stringify([
    options.gravity, options.direction, options.restitution, options.friction, options.air,
    options.velocity && [options.velocity.xMin, options.velocity.xMax, options.velocity.yMin, options.velocity.yMax],
    options.seed
]);

/**
 * Pieces and simulations for each block instance. The pieces and the simulation are kept while the drawn content,
 * the buffer size and the settings stay the same, so playing forward only steps the simulation.
 * @returns {{render: Function, clear: Function, entries: Map}} Cache.
 */
const createShatter = () => {
    const entries = new Map();

    const prepare = (frame, options) => {
        const pixelScale = Number(options.pixelScale) > 0 ? Number(options.pixelScale) : 1;
        const key = String(options.key || '');
        const signature = `${hashFrame(frame)}|${frame.width}x${frame.height}|${pixelScale}|${settingsKey(options)}`;
        const cached = entries.get(key);
        if (cached && cached.signature === signature) {
            // Most recently used last.
            entries.delete(key);
            entries.set(key, cached);
            return cached;
        }
        const halfWidth = frame.width / pixelScale / 2;
        const halfHeight = frame.height / pixelScale / 2;
        const pieces = extractPieces(frame, {pixelScale});
        const bodies = pieces.map(piece => ({
            x: (piece.centerX / pixelScale) - halfWidth,
            y: (piece.centerY / pixelScale) - halfHeight,
            mass: piece.mass,
            inertia: piece.inertia,
            hull: piece.hull
        }));
        const simulation = new Simulation(bodies, {
            gravity: options.gravity,
            direction: options.direction,
            restitution: options.restitution,
            friction: options.friction,
            air: options.air,
            velocity: options.velocity,
            seed: options.seed,
            bounds: {minX: -halfWidth, maxX: halfWidth, minY: -halfHeight, maxY: halfHeight}
        });
        const entry = {signature, pieces, simulation, pixelScale, halfWidth, halfHeight};
        entries.delete(key);
        entries.set(key, entry);
        while (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value);
        return entry;
    };

    /**
     * Split the frame into pieces and draw them `options.time` seconds into their fall.
     * @param {{data: Uint8Array, width: number, height: number}} frame Premultiplied RGBA, rows bottom-up.
     * @param {object} options {key, time, pixelScale, gravity, direction, restitution, friction, air,
     *     velocity: {xMin, xMax, yMin, yMax}, seed}.
     * @param {Uint8Array} [output] Reusable output buffer.
     * @returns {Uint8Array} The frame with the pieces moved.
     */
    const render = (frame, options, output = null) => {
        const length = frame.width * frame.height * 4;
        const target = output && output.length === length ? output : new Uint8Array(length);
        target.fill(0);
        const entry = prepare(frame, options);
        if (!entry.pieces.length) return target;
        const stagePoses = entry.simulation.posesAt(options.time);
        const poses = new Float64Array(stagePoses.length);
        for (let index = 0; index < entry.pieces.length; index++) {
            poses[index * 3] = (stagePoses[index * 3] + entry.halfWidth) * entry.pixelScale;
            poses[(index * 3) + 1] = (stagePoses[(index * 3) + 1] + entry.halfHeight) * entry.pixelScale;
            poses[(index * 3) + 2] = stagePoses[(index * 3) + 2];
        }
        return drawPieces(target, frame.width, frame.height, entry.pieces, poses);
    };

    return {render, clear: () => entries.clear(), entries};
};

module.exports = {createShatter};
