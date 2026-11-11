'use strict';

// C Physics: one C-shaped Objects block. Before `time` the substack draws as usual. From `time` on, the substack is
// drawn as it was at `time` (its own positions, rotations and animation no longer apply), split into pieces like blob
// detection splits a frame into blobs (each connected region with alpha is a piece), and every piece moves as a rigid
// body: gravity in the gravity direction, restitution and friction against the stage edges and the other pieces,
// air resistance, and a random initial velocity per piece. The motion is a deterministic function of the time since
// `time`, so scrubbing, local time, motion blur and export all show the same fall.

const OPCODE = 'cPhysics';

const NUMBER_DEFAULTS = {
    TIME: 1,
    GRAVITY: 980,
    DIRECTION: 180,
    RESTITUTION: 0.5,
    FRICTION: 0.5,
    AIR: 0,
    VX_MIN: -100,
    VX_MAX: 100,
    VY_MIN: 0,
    VY_MAX: 200
};

const numberValue = name => (
    `<value name="${name}"><shadow type="math_number"><field name="NUM">${NUMBER_DEFAULTS[name]}</field>` +
    `</shadow></value>`
);

const toolboxXML = `
<block type="objects_${OPCODE}">
    ${Object.keys(NUMBER_DEFAULTS).map(numberValue)
        .join('')}
</block>`;

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

exports.activate = shading => {
    const {ArgumentType, BlockType, Cast} = shading.scratch;
    const objects = shading.objects;
    const runtime = shading.runtime;
    const locale = shading.l10n.getLocale();

    shading.penfx.extendEngine(require('./lib/engine.js'));
    shading.penfx.extendPenFX(require('./lib/penfx.js'));

    // Run the substack with every time reader frozen at `time` (the freeze mode of the local time block), inside
    // `parent` when the frame graph collects the frame.
    const runFrozen = (util, time, parent) => {
        const thread = util.thread;
        const hadScopes = hasOwn(thread, 'objectTimeScopes');
        const scopes = thread.objectTimeScopes;
        const hadParent = hasOwn(thread, 'objectFrameGraphParent');
        const previousParent = thread.objectFrameGraphParent;
        thread.objectTimeScopes = (Array.isArray(scopes) ? scopes : []).concat([{type: 'freeze', time, legacy: false}]);
        if (parent) thread.objectFrameGraphParent = parent;
        try {
            objects.runWithTransform(util, {});
        } finally {
            if (hadScopes) thread.objectTimeScopes = scopes;
            else delete thread.objectTimeScopes;
            if (hadParent) thread.objectFrameGraphParent = previousParent;
            else delete thread.objectFrameGraphParent;
        }
    };

    // Draw the frozen substack into its own group and let the effect replace the group with the moved pieces.
    const runPhysics = (util, start, options) => {
        const manager = runtime.movieAssetManager;
        const penFX = runtime.penFX;
        if (!penFX || typeof penFX.cPhysics !== 'function' || typeof penFX.beginGroup !== 'function') {
            runFrozen(util, start, null);
            return;
        }
        if (manager && typeof manager.isCollectingFrameGraph === 'function' && manager.isCollectingFrameGraph()) {
            const node = manager.createFrameGraphNode('Composite', {effects: [], operation: 'effects'},
                util.thread.objectFrameGraphParent);
            if (node) {
                runFrozen(util, start, node);
                manager.withFrameGraphParent(node, () => penFX.cPhysics(options));
                return;
            }
        }

        // Without a frame graph (scripts run outside a render frame): the same group, run right away.
        const objectBlocks = runtime.objectBlocks;
        const generation = objectBlocks ? objectBlocks.groupingGeneration : 0;
        const isCurrent = () => !objectBlocks || objectBlocks.groupingGeneration === generation;
        const before = new Set(util.thread.objectPendingDraws || []);
        penFX.beginGroup();
        runFrozen(util, start, null);
        const pending = (util.thread.objectPendingDraws || []).filter(draw => !before.has(draw));
        const finish = () => {
            if (!isCurrent()) return;
            penFX.cPhysics(options);
            penFX.endGroup();
        };
        if (!pending.length) {
            finish();
            return;
        }
        const finished = Promise.all(pending).then(finish, finish);
        if (objectBlocks && typeof objectBlocks.registerPendingGrouping === 'function') {
            objectBlocks.registerPendingGrouping(finished, util);
        } else {
            shading.runWithoutWaiting(finished);
        }
    };

    const physic = (args, util) => {
        const start = Cast.toNumber(args.TIME);
        const now = objects.getTime(util);
        if (!(now >= start) || !util || !util.thread) {
            objects.runWithTransform(util, {});
            return;
        }
        const key = objects.getInstanceId(util);
        runPhysics(util, start, {
            key,
            seed: objects.hash(key),
            time: now - start,
            gravity: Cast.toNumber(args.GRAVITY),
            direction: Cast.toNumber(args.DIRECTION),
            restitution: Cast.toNumber(args.RESTITUTION),
            friction: Cast.toNumber(args.FRICTION),
            air: Cast.toNumber(args.AIR),
            velocity: {
                xMin: Cast.toNumber(args.VX_MIN),
                xMax: Cast.toNumber(args.VX_MAX),
                yMin: Cast.toNumber(args.VY_MIN),
                yMax: Cast.toNumber(args.VY_MAX)
            }
        });
    };

    const label = 'time: [TIME] gravity: [GRAVITY] gravity direction: [DIRECTION] restitution: [RESTITUTION] ' +
        'friction: [FRICTION] Air Resistance [AIR] Random: [VX_MIN] [VX_MAX] [VY_MIN] [VY_MAX]';
    const number = name => ({type: ArgumentType.NUMBER, defaultValue: NUMBER_DEFAULTS[name]});

    objects.addBlocks({
        blocks: [{
            opcode: OPCODE,
            blockType: BlockType.CONDITIONAL,
            branchCount: 1,
            text: shading.l10n.localize(locale, `physic ${label}`, `物理演算 ${label}`),
            arguments: {
                TIME: {type: ArgumentType.NUMBER, defaultValue: NUMBER_DEFAULTS.TIME, timelineTime: true},
                GRAVITY: number('GRAVITY'),
                DIRECTION: number('DIRECTION'),
                RESTITUTION: number('RESTITUTION'),
                FRICTION: number('FRICTION'),
                AIR: number('AIR'),
                VX_MIN: number('VX_MIN'),
                VX_MAX: number('VX_MAX'),
                VY_MIN: number('VY_MIN'),
                VY_MAX: number('VY_MAX')
            }
        }],
        methods: {[OPCODE]: physic},
        toolboxXML
    });
};
