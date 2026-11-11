'use strict';

// A small deterministic 2D rigid-body solver for the pieces: convex polygon bodies inside the stage, gravity, air
// resistance (linear drag), restitution and Coulomb friction. Contacts are found with the separating axis test and
// incident edge clipping, and solved with sequential impulses. Everything is plain double arithmetic in a fixed
// order, so the same pieces and settings always give the same motion.
//
// Units are stage units (y up) and seconds. Angles are radians, counter-clockwise.

const STEP = 1 / 120;
const ITERATIONS = 10;
const BAUMGARTE = 0.2;
const SLOP = 0.25;
const RESTITUTION_THRESHOLD = 50;
const CHECKPOINT_INTERVAL = 120;
// Simulating further than this (seconds) shows the state at this time.
const MAX_TIME = 600;
const STRIDE = 6;

const finite = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

// mulberry32: the random initial velocity of piece `index` for a seed.
const random = (seed, index) => {
    let t = ((seed >>> 0) ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
    t = (t + 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const between = (minimum, maximum, amount) => minimum + ((maximum - minimum) * amount);

// Gravity direction uses Scratch directions: 0 is up, 90 right, 180 down.
const gravityVector = (strength, direction) => {
    const radians = finite(direction, 180) * Math.PI / 180;
    const amount = finite(strength, 980);
    const x = Math.sin(radians) * amount;
    const y = Math.cos(radians) * amount;
    return {x: Math.abs(x) < 1e-9 ? 0 : x, y: Math.abs(y) < 1e-9 ? 0 : y};
};

/**
 * Create a world.
 * @param {object[]} bodies {x, y, mass, inertia, hull: [[x, y], ...] counter-clockwise around the centroid}.
 * @param {object} settings {gravity, direction, restitution, friction, air, velocity: {xMin, xMax, yMin, yMax},
 *     seed, bounds: {minX, maxX, minY, maxY}}.
 * @returns {object} World.
 */
const createWorld = (bodies, settings = {}) => {
    const count = bodies.length;
    const state = new Float64Array(count * STRIDE);
    const velocity = settings.velocity || {};
    const seed = finite(settings.seed) >>> 0;
    bodies.forEach((body, index) => {
        const offset = index * STRIDE;
        state[offset] = finite(body.x);
        state[offset + 1] = finite(body.y);
        state[offset + 3] = between(finite(velocity.xMin), finite(velocity.xMax), random(seed, index * 2));
        state[offset + 4] = between(finite(velocity.yMin), finite(velocity.yMax), random(seed, (index * 2) + 1));
    });
    const shapes = bodies.map(body => {
        const hull = body.hull;
        let radius = 0;
        for (const [x, y] of hull) radius = Math.max(radius, Math.hypot(x, y));
        const mass = finite(body.mass);
        const inertia = finite(body.inertia);
        return {
            hull,
            radius,
            invMass: mass > 0 ? 1 / mass : 0,
            invInertia: inertia > 0 ? 1 / inertia : 0,
            world: new Float64Array(hull.length * 2)
        };
    });
    const bounds = settings.bounds || {};
    return {
        bounds: {
            minX: finite(bounds.minX, -240),
            maxX: finite(bounds.maxX, 240),
            minY: finite(bounds.minY, -180),
            maxY: finite(bounds.maxY, 180)
        },
        count,
        friction: Math.max(0, finite(settings.friction, 0.5)),
        gravity: gravityVector(settings.gravity, settings.direction),
        // Air resistance is a drag rate (1/s): velocities lose that fraction per second.
        drag: Math.max(0, finite(settings.air)),
        restitution: Math.max(0, finite(settings.restitution, 0.5)),
        shapes,
        state,
        steps: 0,
        // Impulses of the last step's contacts, applied again first (warm starting) so piles come to rest.
        impulses: new Map()
    };
};

const updateVertices = world => {
    const {count, shapes, state} = world;
    for (let index = 0; index < count; index++) {
        const offset = index * STRIDE;
        const x = state[offset];
        const y = state[offset + 1];
        const cos = Math.cos(state[offset + 2]);
        const sin = Math.sin(state[offset + 2]);
        const shape = shapes[index];
        const hull = shape.hull;
        for (let vertex = 0; vertex < hull.length; vertex++) {
            const [lx, ly] = hull[vertex];
            shape.world[vertex * 2] = x + (cos * lx) - (sin * ly);
            shape.world[(vertex * 2) + 1] = y + (sin * lx) + (cos * ly);
        }
    }
};

// Largest separation of polygon b from the edges of polygon a: {separation, edge}.
const maxSeparation = (a, b) => {
    const va = a.world;
    const vb = b.world;
    const na = a.hull.length;
    const nb = b.hull.length;
    let best = -Infinity;
    let bestEdge = 0;
    for (let i = 0; i < na; i++) {
        const j = (i + 1) % na;
        const x1 = va[i * 2];
        const y1 = va[(i * 2) + 1];
        const dx = va[j * 2] - x1;
        const dy = va[(j * 2) + 1] - y1;
        const length = Math.hypot(dx, dy) || 1;
        const nx = dy / length;
        const ny = -dx / length;
        let minimum = Infinity;
        for (let k = 0; k < nb; k++) {
            const distance = (nx * (vb[k * 2] - x1)) + (ny * (vb[(k * 2) + 1] - y1));
            if (distance < minimum) minimum = distance;
        }
        if (minimum > best) {
            best = minimum;
            bestEdge = i;
        }
    }
    return {separation: best, edge: bestEdge};
};

const edgeNormal = (shape, edge) => {
    const vertices = shape.world;
    const count = shape.hull.length;
    const next = (edge + 1) % count;
    const dx = vertices[next * 2] - vertices[edge * 2];
    const dy = vertices[(next * 2) + 1] - vertices[(edge * 2) + 1];
    const length = Math.hypot(dx, dy) || 1;
    return {x: dy / length, y: -dx / length};
};

// Keep the part of a segment behind a plane. A point made by the clip takes the plane's id, so contact ids stay the
// same from step to step (warm starting matches contacts by id).
const clipSegment = (points, nx, ny, offset, id) => {
    const result = [];
    const d0 = (nx * points[0].x) + (ny * points[0].y) - offset;
    const d1 = (nx * points[1].x) + (ny * points[1].y) - offset;
    if (d0 <= 0) result.push(points[0]);
    if (d1 <= 0) result.push(points[1]);
    if (d0 * d1 < 0) {
        const t = d0 / (d0 - d1);
        result.push({
            x: points[0].x + ((points[1].x - points[0].x) * t),
            y: points[0].y + ((points[1].y - points[0].y) * t),
            id
        });
    }
    return result;
};

// Contacts between bodies a and b, normals pointing from a to b.
const collidePolygons = (world, a, b, contacts) => {
    const shapeA = world.shapes[a];
    const shapeB = world.shapes[b];
    const separationA = maxSeparation(shapeA, shapeB);
    if (separationA.separation > 0) return;
    const separationB = maxSeparation(shapeB, shapeA);
    if (separationB.separation > 0) return;
    const flip = separationB.separation > separationA.separation + (0.1 * SLOP);
    const reference = flip ? shapeB : shapeA;
    const incident = flip ? shapeA : shapeB;
    const edge = flip ? separationB.edge : separationA.edge;
    const normal = edgeNormal(reference, edge);

    // The incident edge is the one facing the reference normal the most.
    const incidentCount = incident.hull.length;
    let incidentEdge = 0;
    let minimumDot = Infinity;
    for (let i = 0; i < incidentCount; i++) {
        const n = edgeNormal(incident, i);
        const dot = (n.x * normal.x) + (n.y * normal.y);
        if (dot < minimumDot) {
            minimumDot = dot;
            incidentEdge = i;
        }
    }
    const iv = incident.world;
    const i2 = (incidentEdge + 1) % incidentCount;
    let points = [
        {x: iv[incidentEdge * 2], y: iv[(incidentEdge * 2) + 1], id: `v${incidentEdge}`},
        {x: iv[i2 * 2], y: iv[(i2 * 2) + 1], id: `v${i2}`}
    ];
    const rv = reference.world;
    const r2 = (edge + 1) % reference.hull.length;
    const v1 = {x: rv[edge * 2], y: rv[(edge * 2) + 1]};
    const v2 = {x: rv[r2 * 2], y: rv[(r2 * 2) + 1]};
    const tx = v2.x - v1.x;
    const ty = v2.y - v1.y;
    const length = Math.hypot(tx, ty) || 1;
    const ux = tx / length;
    const uy = ty / length;
    points = clipSegment(points, -ux, -uy, -((ux * v1.x) + (uy * v1.y)), 'c0');
    if (points.length < 2) return;
    points = clipSegment(points, ux, uy, (ux * v2.x) + (uy * v2.y), 'c1');
    if (points.length < 2) return;
    const front = (normal.x * v1.x) + (normal.y * v1.y);
    const nx = flip ? -normal.x : normal.x;
    const ny = flip ? -normal.y : normal.y;
    for (const point of points) {
        const separation = (normal.x * point.x) + (normal.y * point.y) - front;
        if (separation > 0) continue;
        // The contact sits halfway between the incident point and the reference face.
        contacts.push({
            a,
            b,
            nx,
            ny,
            px: point.x - (normal.x * separation * 0.5),
            py: point.y - (normal.y * separation * 0.5),
            depth: -separation,
            feature: `${flip ? 1 : 0}:${edge}:${point.id}`
        });
    }
};

const WALLS = [
    {nx: 0, ny: 1, key: 'minY', sign: 1},
    {nx: 0, ny: -1, key: 'maxY', sign: -1},
    {nx: 1, ny: 0, key: 'minX', sign: 1},
    {nx: -1, ny: 0, key: 'maxX', sign: -1}
];

// Contacts with the stage edges: up to the two deepest vertices per wall. The wall is body -1.
const collideWalls = (world, index, contacts) => {
    const shape = world.shapes[index];
    const vertices = shape.world;
    const count = shape.hull.length;
    for (let wallIndex = 0; wallIndex < WALLS.length; wallIndex++) {
        const wall = WALLS[wallIndex];
        const limit = world.bounds[wall.key] * wall.sign;
        let first = null;
        let second = null;
        for (let vertex = 0; vertex < count; vertex++) {
            const x = vertices[vertex * 2];
            const y = vertices[(vertex * 2) + 1];
            const depth = limit - ((wall.nx * x) + (wall.ny * y));
            if (depth <= 0) continue;
            const contact = {
                a: -1, b: index, nx: wall.nx, ny: wall.ny, px: x, py: y, depth, feature: `w${wallIndex}:${vertex}`
            };
            if (!first || depth > first.depth) {
                second = first;
                first = contact;
            } else if (!second || depth > second.depth) {
                second = contact;
            }
        }
        if (first) contacts.push(first);
        if (second) contacts.push(second);
    }
};

const findContacts = world => {
    const {count, shapes} = world;
    const contacts = [];
    const boxes = new Float64Array(count * 4);
    const order = [];
    for (let index = 0; index < count; index++) {
        const vertices = shapes[index].world;
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (let k = 0; k < vertices.length; k += 2) {
            if (vertices[k] < minX) minX = vertices[k];
            if (vertices[k] > maxX) maxX = vertices[k];
            if (vertices[k + 1] < minY) minY = vertices[k + 1];
            if (vertices[k + 1] > maxY) maxY = vertices[k + 1];
        }
        boxes[index * 4] = minX;
        boxes[(index * 4) + 1] = maxX;
        boxes[(index * 4) + 2] = minY;
        boxes[(index * 4) + 3] = maxY;
        order.push(index);
        collideWalls(world, index, contacts);
    }
    // Sweep and prune along x.
    order.sort((p, q) => (boxes[p * 4] - boxes[q * 4]) || (p - q));
    for (let i = 0; i < order.length; i++) {
        const a = order[i];
        const maxX = boxes[(a * 4) + 1];
        for (let j = i + 1; j < order.length; j++) {
            const b = order[j];
            if (boxes[b * 4] > maxX) break;
            if (boxes[(b * 4) + 2] > boxes[(a * 4) + 3] || boxes[(b * 4) + 3] < boxes[(a * 4) + 2]) continue;
            if (a < b) collidePolygons(world, a, b, contacts);
            else collidePolygons(world, b, a, contacts);
        }
    }
    return contacts;
};

const step = world => {
    const {count, shapes, state, gravity} = world;
    const dt = STEP;
    const damping = Math.exp(-world.drag * dt);
    for (let index = 0; index < count; index++) {
        const offset = index * STRIDE;
        if (shapes[index].invMass === 0) continue;
        state[offset + 3] = (state[offset + 3] + (gravity.x * dt)) * damping;
        state[offset + 4] = (state[offset + 4] + (gravity.y * dt)) * damping;
        state[offset + 5] *= damping;
    }

    updateVertices(world);
    const contacts = findContacts(world);
    const restitution = world.restitution;
    const friction = world.friction;

    const velocityAt = (body, rx, ry) => {
        if (body < 0) return {x: 0, y: 0};
        const offset = body * STRIDE;
        const w = state[offset + 5];
        return {x: state[offset + 3] - (w * ry), y: state[offset + 4] + (w * rx)};
    };
    const applyImpulse = (body, rx, ry, px, py, sign) => {
        if (body < 0) return;
        const shape = shapes[body];
        const offset = body * STRIDE;
        state[offset + 3] += sign * px * shape.invMass;
        state[offset + 4] += sign * py * shape.invMass;
        state[offset + 5] += sign * ((rx * py) - (ry * px)) * shape.invInertia;
    };

    for (const contact of contacts) {
        const {a, b, nx, ny} = contact;
        const shapeA = a < 0 ? null : shapes[a];
        const shapeB = shapes[b];
        contact.ax = a < 0 ? 0 : contact.px - state[a * STRIDE];
        contact.ay = a < 0 ? 0 : contact.py - state[(a * STRIDE) + 1];
        contact.bx = contact.px - state[b * STRIDE];
        contact.by = contact.py - state[(b * STRIDE) + 1];
        const invMassA = shapeA ? shapeA.invMass : 0;
        const invInertiaA = shapeA ? shapeA.invInertia : 0;
        const crossNA = (contact.ax * ny) - (contact.ay * nx);
        const crossNB = (contact.bx * ny) - (contact.by * nx);
        const kNormal = invMassA + shapeB.invMass + (invInertiaA * crossNA * crossNA) +
            (shapeB.invInertia * crossNB * crossNB);
        const tx = ny;
        const ty = -nx;
        const crossTA = (contact.ax * ty) - (contact.ay * tx);
        const crossTB = (contact.bx * ty) - (contact.by * tx);
        const kTangent = invMassA + shapeB.invMass + (invInertiaA * crossTA * crossTA) +
            (shapeB.invInertia * crossTB * crossTB);
        contact.massNormal = kNormal > 0 ? 1 / kNormal : 0;
        contact.massTangent = kTangent > 0 ? 1 / kTangent : 0;
        const va = velocityAt(a, contact.ax, contact.ay);
        const vb = velocityAt(b, contact.bx, contact.by);
        const approach = ((vb.x - va.x) * nx) + ((vb.y - va.y) * ny);
        const bounce = approach < -RESTITUTION_THRESHOLD ? -restitution * approach : 0;
        const push = (BAUMGARTE / dt) * Math.max(0, contact.depth - SLOP);
        contact.bias = Math.max(bounce, push);
        contact.key = `${a}|${b}|${contact.feature}`;
    }
    // Warm start only after every contact measured its approach speed, so restitution sees the incoming velocities.
    for (const contact of contacts) {
        const previous = world.impulses.get(contact.key);
        contact.normalImpulse = previous ? previous[0] : 0;
        contact.tangentImpulse = previous ? previous[1] : 0;
        if (!previous) continue;
        const {a, b, nx, ny} = contact;
        const px = (nx * contact.normalImpulse) + (ny * contact.tangentImpulse);
        const py = (ny * contact.normalImpulse) - (nx * contact.tangentImpulse);
        applyImpulse(a, contact.ax, contact.ay, px, py, -1);
        applyImpulse(b, contact.bx, contact.by, px, py, 1);
    }

    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
        for (const contact of contacts) {
            const {a, b, nx, ny} = contact;
            let va = velocityAt(a, contact.ax, contact.ay);
            let vb = velocityAt(b, contact.bx, contact.by);
            const normalVelocity = ((vb.x - va.x) * nx) + ((vb.y - va.y) * ny);
            const previousNormal = contact.normalImpulse;
            const normalStep = contact.massNormal * (contact.bias - normalVelocity);
            contact.normalImpulse = Math.max(0, previousNormal + normalStep);
            const normalChange = contact.normalImpulse - previousNormal;
            applyImpulse(a, contact.ax, contact.ay, nx * normalChange, ny * normalChange, -1);
            applyImpulse(b, contact.bx, contact.by, nx * normalChange, ny * normalChange, 1);

            va = velocityAt(a, contact.ax, contact.ay);
            vb = velocityAt(b, contact.bx, contact.by);
            const tx = ny;
            const ty = -nx;
            const tangentVelocity = ((vb.x - va.x) * tx) + ((vb.y - va.y) * ty);
            const limit = friction * contact.normalImpulse;
            const previousTangent = contact.tangentImpulse;
            const tangentStep = contact.massTangent * tangentVelocity;
            contact.tangentImpulse = Math.max(-limit, Math.min(limit, previousTangent - tangentStep));
            const tangentChange = contact.tangentImpulse - previousTangent;
            applyImpulse(a, contact.ax, contact.ay, tx * tangentChange, ty * tangentChange, -1);
            applyImpulse(b, contact.bx, contact.by, tx * tangentChange, ty * tangentChange, 1);
        }
    }

    world.impulses = new Map();
    for (const contact of contacts) world.impulses.set(contact.key, [contact.normalImpulse, contact.tangentImpulse]);

    for (let index = 0; index < count; index++) {
        const offset = index * STRIDE;
        state[offset] += state[offset + 3] * dt;
        state[offset + 1] += state[offset + 4] * dt;
        state[offset + 2] += state[offset + 5] * dt;
    }
    world.steps++;
    return contacts.length;
};

/**
 * Poses at any time, stepping a world forward and keeping checkpoints so scrubbing back does not start over.
 */
class Simulation {
    constructor (bodies, settings) {
        this.bodies = bodies;
        this.settings = settings;
        this.world = createWorld(bodies, settings);
        this.checkpoints = [this.checkpoint()];
    }

    checkpoint () {
        const world = this.world;
        return {steps: world.steps, state: world.state.slice(), impulses: new Map(world.impulses)};
    }

    seek (steps) {
        const world = this.world;
        if (steps < world.steps) {
            let checkpoint = this.checkpoints[0];
            for (const entry of this.checkpoints) {
                if (entry.steps <= steps) checkpoint = entry;
            }
            world.state.set(checkpoint.state);
            world.steps = checkpoint.steps;
            world.impulses = new Map(checkpoint.impulses);
        }
        while (world.steps < steps) {
            step(world);
            if (world.steps % CHECKPOINT_INTERVAL === 0 &&
                world.steps > this.checkpoints[this.checkpoints.length - 1].steps) {
                this.checkpoints.push(this.checkpoint());
            }
        }
    }

    /**
     * Poses `time` seconds after the start, interpolated between steps.
     * @param {number} time Seconds since the simulation started.
     * @returns {Float64Array} x, y, angle per body.
     */
    posesAt (time) {
        const clamped = Math.max(0, Math.min(MAX_TIME, finite(time)));
        const exact = clamped / STEP;
        const lower = Math.floor(exact + 1e-9);
        const fraction = Math.max(0, exact - lower);
        const count = this.world.count;
        const poses = new Float64Array(count * 3);
        this.seek(lower);
        const state = this.world.state;
        for (let index = 0; index < count; index++) {
            poses[index * 3] = state[index * STRIDE];
            poses[(index * 3) + 1] = state[(index * STRIDE) + 1];
            poses[(index * 3) + 2] = state[(index * STRIDE) + 2];
        }
        if (fraction > 1e-9) {
            this.seek(lower + 1);
            for (let index = 0; index < count; index++) {
                for (let k = 0; k < 3; k++) {
                    const value = poses[(index * 3) + k];
                    poses[(index * 3) + k] = value + ((state[(index * STRIDE) + k] - value) * fraction);
                }
            }
        }
        return poses;
    }
}

module.exports = {MAX_TIME, STEP, Simulation, createWorld, gravityVector, random, step};
