// Physics: 3D rigid bodies for Shading simulations, computed by Rapier's deterministic build.
//
// The plugin is a simulation solver (`rapier3d`) plus Simulation blocks. A simulation's initialize script creates
// the world and its bodies; every step runs the step script (forces, impulses, kinematic targets) and then
// world.step(). Render-frame scripts read the poses at their evaluation time, interpolated between steps, so they
// work inside local time, motion blur and echo blocks.
//
// Units are stage units: 100 stage units are 1 m inside Rapier, and gravity defaults to 980 stage units / s^2 down.
const RAPIER = require('./lib/rapier3d.js');
const {eulerToQuaternion, quaternionToEuler} = require('./lib/rotation.js');

const SOLVER_ID = 'rapier3d';
const SCALE = 100;
const SHAPES = ['box', 'sphere', 'capsule', 'plane'];
const BODY_TYPES = ['dynamic', 'fixed', 'kinematic'];
const PROPERTIES = ['x', 'y', 'z', 'rotation x', 'rotation y', 'rotation z'];

let ready = false;

const number = (value, fallback = 0) => {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
};

const meters = vector => ({x: vector.x / SCALE, y: vector.y / SCALE, z: vector.z / SCALE});

// A world with the body names and the collisions that started during its last step.
const createWrapper = world => ({
    world,
    eventQueue: new RAPIER.EventQueue(true),
    bodies: new Map(),
    colliders: new Map(),
    started: []
});

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const solver = {
    id: SOLVER_ID,

    create (settings) {
        if (!ready) throw new Error('Physics is still loading.');
        const gravity = settings.gravity || {x: 0, y: -980, z: 0};
        return createWrapper(new RAPIER.World(meters(gravity)));
    },

    // Forces apply for one step: clear them before the step script adds this step's forces.
    beforeStep (wrapper) {
        for (const {body} of wrapper.bodies.values()) {
            body.resetForces(true);
            body.resetTorques(true);
        }
    },

    step (wrapper, dt) {
        wrapper.world.timestep = dt;
        wrapper.world.step(wrapper.eventQueue);
        wrapper.started = [];
        wrapper.eventQueue.drainCollisionEvents((first, second, started) => {
            const a = wrapper.colliders.get(first);
            const b = wrapper.colliders.get(second);
            if (started && a && b) wrapper.started.push([a, b].sort());
        });
        wrapper.started.sort((p, q) => (p.join('\u0000') < q.join('\u0000') ? -1 : 1));
    },

    // Bytes: [metadata length (4 bytes)][metadata JSON][Rapier snapshot]. The metadata keeps body names and the
    // collisions of the last step, so a restored world answers "touching" like the original.
    snapshot (wrapper) {
        const metadata = encoder.encode(JSON.stringify({
            bodies: Array.from(wrapper.bodies, ([name, entry]) => [name, entry.body.handle, entry.collider.handle]),
            started: wrapper.started
        }));
        const world = wrapper.world.takeSnapshot();
        const bytes = new Uint8Array(4 + metadata.length + world.length);
        new DataView(bytes.buffer).setUint32(0, metadata.length);
        bytes.set(metadata, 4);
        bytes.set(world, 4 + metadata.length);
        return bytes;
    },

    restore (bytes) {
        const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
        const metadata = JSON.parse(decoder.decode(bytes.subarray(4, 4 + length)));
        const wrapper = createWrapper(RAPIER.World.restoreSnapshot(bytes.slice(4 + length)));
        for (const [name, bodyHandle, colliderHandle] of metadata.bodies) {
            const entry = {body: wrapper.world.getRigidBody(bodyHandle), collider: wrapper.world.getCollider(colliderHandle)};
            wrapper.bodies.set(name, entry);
            wrapper.colliders.set(colliderHandle, name);
        }
        wrapper.started = metadata.started;
        return wrapper;
    },

    dispose (wrapper) {
        wrapper.eventQueue.free();
        wrapper.world.free();
    },

    readPose (wrapper, name) {
        const entry = wrapper.bodies.get(name);
        if (!entry) return null;
        const position = entry.body.translation();
        const rotation = entry.body.rotation();
        return {
            position: {x: position.x * SCALE, y: position.y * SCALE, z: position.z * SCALE},
            quaternion: {x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w}
        };
    }
};

const colliderFor = (shape, size) => {
    const half = {x: Math.abs(size.x) / 2 / SCALE, y: Math.abs(size.y) / 2 / SCALE, z: Math.abs(size.z) / 2 / SCALE};
    if (shape === 'sphere') return RAPIER.ColliderDesc.ball(half.x);
    if (shape === 'capsule') return RAPIER.ColliderDesc.capsule(Math.max(0, half.y - half.x), half.x);
    // A plane is the infinite half space below the body's local +Y face.
    if (shape === 'plane') return new RAPIER.ColliderDesc(new RAPIER.HalfSpace({x: 0, y: 1, z: 0}));
    return RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z);
};

exports.activate = shading => {
    const {ArgumentType, BlockType} = shading.scratch;
    const locale = shading.l10n.getLocale();
    const text = (english, japanese) => shading.l10n.localize(locale, english, japanese);
    const numberArgument = defaultValue => ({type: ArgumentType.NUMBER, defaultValue});
    const name = defaultValue => ({type: ArgumentType.STRING, defaultValue});
    const runtime = shading.runtime;
    // Engines without simulations (or a VM without them) have nothing to add physics to.
    if (!runtime.simulationRuntime) return;

    const worldOf = util => {
        const context = shading.simulation.getContext(util);
        const world = context && context.getWorld();
        return world && world.world ? {context, wrapper: world} : null;
    };

    const bodyOf = (util, bodyName) => {
        const found = worldOf(util);
        const entry = found && found.wrapper.bodies.get(String(bodyName));
        return entry ? entry.body : null;
    };

    // The pose of a body at the block's evaluation time, from whichever simulation has it. Inside a step it is the
    // body's current pose.
    const poseOf = (util, bodyName) => {
        const found = worldOf(util);
        if (found) return solver.readPose(found.wrapper, String(bodyName));
        const simulations = runtime.simulationRuntime ? runtime.simulationRuntime.names() : [];
        for (const simulation of simulations) {
            const pose = shading.simulation.readPose(simulation, String(bodyName), undefined, util);
            if (pose) return pose;
        }
        return null;
    };

    shading.simulation.registerSolver(solver);
    shading.simulation.addBlocks({
        blocks: [
            {
                opcode: 'physicsCreateWorld',
                blockType: BlockType.COMMAND,
                text: text('create physics world gravity x [GX] y [GY] z [GZ]', '物理ワールドを作る 重力 x [GX] y [GY] z [GZ]'),
                arguments: {GX: numberArgument(0), GY: numberArgument(-980), GZ: numberArgument(0)}
            },
            {
                opcode: 'physicsAddBody',
                blockType: BlockType.COMMAND,
                text: text(
                    'add rigid body [NAME] shape [SHAPE] position x [PX] y [PY] z [PZ] rotation x [RX] y [RY] ' +
                        'z [RZ] size x [SX] y [SY] z [SZ] type [TYPE] mass [MASS] bounce [RESTITUTION] ' +
                        'friction [FRICTION]',
                    '剛体 [NAME] を追加 形 [SHAPE] 位置 x [PX] y [PY] z [PZ] 回転 x [RX] y [RY] z [RZ] ' +
                        '大きさ x [SX] y [SY] z [SZ] 種類 [TYPE] 質量 [MASS] 反発 [RESTITUTION] 摩擦 [FRICTION]'
                ),
                arguments: {
                    NAME: name('body'),
                    SHAPE: {type: ArgumentType.STRING, menu: 'physicsShape', defaultValue: 'box'},
                    PX: numberArgument(0), PY: numberArgument(100), PZ: numberArgument(480),
                    RX: numberArgument(0), RY: numberArgument(0), RZ: numberArgument(0),
                    SX: numberArgument(50), SY: numberArgument(50), SZ: numberArgument(50),
                    TYPE: {type: ArgumentType.STRING, menu: 'physicsBodyType', defaultValue: 'dynamic'},
                    MASS: numberArgument(1), RESTITUTION: numberArgument(0.3), FRICTION: numberArgument(0.5)
                }
            },
            '---',
            {
                opcode: 'physicsApplyForce',
                blockType: BlockType.COMMAND,
                text: text('apply force x [X] y [Y] z [Z] to rigid body [NAME]', '剛体 [NAME] に力 x [X] y [Y] z [Z] を加える'),
                arguments: {NAME: name('body'), X: numberArgument(0), Y: numberArgument(100), Z: numberArgument(0)}
            },
            {
                opcode: 'physicsApplyImpulse',
                blockType: BlockType.COMMAND,
                text: text('apply impulse x [X] y [Y] z [Z] to rigid body [NAME]',
                    '剛体 [NAME] に衝撃 x [X] y [Y] z [Z] を加える'),
                arguments: {NAME: name('body'), X: numberArgument(0), Y: numberArgument(100), Z: numberArgument(0)}
            },
            {
                opcode: 'physicsMoveKinematic',
                blockType: BlockType.COMMAND,
                text: text('move kinematic rigid body [NAME] to x [X] y [Y] z [Z]',
                    'キネマティック剛体 [NAME] を x [X] y [Y] z [Z] へ'),
                arguments: {NAME: name('body'), X: numberArgument(0), Y: numberArgument(0), Z: numberArgument(480)}
            },
            {
                opcode: 'physicsHit',
                blockType: BlockType.BOOLEAN,
                text: text('[A] hit [B]?', '[A] が [B] に当たった'),
                arguments: {A: name('body'), B: name('floor')}
            },
            '---',
            {
                opcode: 'physicsBodyValue',
                blockType: BlockType.REPORTER,
                text: text('[PROPERTY] of rigid body [NAME]', '剛体 [NAME] の [PROPERTY]'),
                arguments: {
                    NAME: name('body'),
                    PROPERTY: {type: ArgumentType.STRING, menu: 'physicsProperty', defaultValue: 'y'}
                }
            },
            {
                opcode: 'physicsAtBody',
                blockType: BlockType.CONDITIONAL,
                branchCount: 1,
                text: text('at rigid body [NAME]', '剛体 [NAME] の位置で'),
                arguments: {NAME: name('body')}
            }
        ],
        menus: {
            physicsShape: {acceptReporters: true, items: SHAPES},
            physicsBodyType: {acceptReporters: true, items: BODY_TYPES},
            physicsProperty: {acceptReporters: true, items: PROPERTIES}
        },
        methods: {
            physicsCreateWorld: (args, util) => {
                const context = shading.simulation.getContext(util);
                if (!context || context.phase !== 'initialize') return;
                context.createWorld(SOLVER_ID, {gravity: {x: number(args.GX), y: number(args.GY, -980), z: number(args.GZ)}});
            },
            physicsAddBody: (args, util) => {
                const found = worldOf(util);
                if (!found || found.context.phase !== 'initialize') return;
                const bodyName = String(args.NAME);
                const {wrapper, context} = found;
                if (wrapper.bodies.has(bodyName)) return;
                const shape = SHAPES.includes(String(args.SHAPE)) ? String(args.SHAPE) : 'box';
                const requestedType = String(args.TYPE);
                const type = shape === 'plane' ? 'fixed' : (BODY_TYPES.includes(requestedType) ? requestedType : 'dynamic');
                let description = type === 'fixed' ? RAPIER.RigidBodyDesc.fixed() :
                    type === 'kinematic' ? RAPIER.RigidBodyDesc.kinematicPositionBased() : RAPIER.RigidBodyDesc.dynamic();
                // Input numbers go to Rapier as they are; only rotations need sines (exact for multiples of 90).
                description = description
                    .setTranslation(number(args.PX) / SCALE, number(args.PY) / SCALE, number(args.PZ) / SCALE)
                    .setRotation(eulerToQuaternion({x: number(args.RX), y: number(args.RY), z: number(args.RZ)}));
                const body = wrapper.world.createRigidBody(description);
                const colliderDescription = colliderFor(shape, {
                    x: number(args.SX, 50), y: number(args.SY, 50), z: number(args.SZ, 50)
                })
                    .setRestitution(Math.max(0, number(args.RESTITUTION, 0.3)))
                    .setFriction(Math.max(0, number(args.FRICTION, 0.5)))
                    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
                if (type === 'dynamic') colliderDescription.setMass(Math.max(1e-6, number(args.MASS, 1)));
                const collider = wrapper.world.createCollider(colliderDescription, body);
                wrapper.bodies.set(bodyName, {body, collider});
                wrapper.colliders.set(collider.handle, bodyName);
                context.state.handles.set(bodyName, body.handle);
            },
            physicsApplyForce: (args, util) => {
                const body = bodyOf(util, args.NAME);
                if (body) body.addForce(meters({x: number(args.X), y: number(args.Y), z: number(args.Z)}), true);
            },
            physicsApplyImpulse: (args, util) => {
                const body = bodyOf(util, args.NAME);
                if (body) body.applyImpulse(meters({x: number(args.X), y: number(args.Y), z: number(args.Z)}), true);
            },
            physicsMoveKinematic: (args, util) => {
                const body = bodyOf(util, args.NAME);
                if (body && body.isKinematic()) {
                    body.setNextKinematicTranslation(meters({x: number(args.X), y: number(args.Y), z: number(args.Z)}));
                }
            },
            physicsHit: (args, util) => {
                const found = worldOf(util);
                if (!found) return false;
                const pair = [String(args.A), String(args.B)].sort().join('\u0000');
                return found.wrapper.started.some(started => started.join('\u0000') === pair);
            },
            physicsBodyValue: (args, util) => {
                const pose = poseOf(util, args.NAME);
                if (!pose) return 0;
                const property = String(args.PROPERTY);
                if (property.startsWith('rotation')) {
                    const euler = quaternionToEuler(pose.quaternion);
                    return euler[property.slice(-1)] || 0;
                }
                return pose.position[property] || 0;
            },
            physicsAtBody: (args, util) => {
                const pose = poseOf(util, args.NAME);
                shading.objects.runWithTransform(util, pose ? {
                    position: pose.position,
                    rotation: quaternionToEuler(pose.quaternion)
                } : {});
            }
        }
    });

    return RAPIER.init().then(() => {
        ready = true;
    });
};

exports.solver = solver;
