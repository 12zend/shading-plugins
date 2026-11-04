'use strict';

const {DIRECTIONS, EASE_TYPES, glyphOffset, layoutLine} = require('./lib/motion.js');

// Lyric Motion: one Objects block that draws a lyric character by character. Each character starts at a random
// angle `radius` away from its place and eases into it (Power, Expo or Circ Out; elastic speed adds the easing
// block's oscillation), the next one `time interval` later, with optional jitter and shake. Text is drawn in one
// color, and offset adds per-character x, y and size lists ("0 10 5 -3 4") that do not change the spacing.

const OPCODE = 'lyricMotion';
const FONT_MENU = 'lyricMotionFont';
const DEFAULT_FONT = 'Zen Kaku Gothic New Bold';
const DEFAULT_KANJI_FONT = 'Shippori Mincho Bold';
const DEFAULT_COLOR = '#000000';
// Inputs that start a row of the block: fonts and color, per-character offsets, motion, position, sizes and
// layout, time, jitter, shake.
const ROW_STARTS = ['FONT', 'OX', 'RADIUS', 'PX', 'SIZE', 'T1', 'RANDOMNESS', 'SHAKE_SPEED'];

const NUMBER_DEFAULTS = {
    RADIUS: 200,
    SPEED: 0,
    PX: 0,
    PY: 0,
    PZ: 480,
    SIZE: 100,
    TEXT_SIZE: 80,
    KANJI_SIZE: 100,
    SPACING: 0,
    T1: 0,
    T2: 1,
    INTERVAL: 0.1,
    RANDOMNESS: 0,
    FPS: 12,
    SHAKE_SPEED: 0,
    SHAKE_X: 0,
    SHAKE_Y: 0
};

const xmlEscape = text => String(text).replace(/[<>&'"]/g, char => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '\'': '&apos;', '"': '&quot;'
}[char]));

const numberValue = name => (
    `<value name="${name}"><shadow type="math_number"><field name="NUM">${NUMBER_DEFAULTS[name]}</field>` +
    `</shadow></value>`
);

const fontValue = (name, font) => (
    `<value name="${name}"><shadow type="objects_menu_${FONT_MENU}">` +
    `<field name="${FONT_MENU}">${xmlEscape(font)}</field></shadow></value>`
);

const textValue = (name, text) => (
    `<value name="${name}"><shadow type="text"><field name="TEXT">${xmlEscape(text)}</field></shadow></value>`
);

const toolboxXML = `
<block type="objects_${OPCODE}">
    <value name="CHAR"><shadow type="text"><field name="TEXT">歌詞が飛び込む</field></shadow></value>
    ${fontValue('FONT', DEFAULT_FONT)}
    ${fontValue('KANJI_FONT', DEFAULT_KANJI_FONT)}
    <value name="COLOR"><shadow type="colour_picker"><field name="COLOUR">${DEFAULT_COLOR}</field></shadow></value>
    ${textValue('OX', '')}
    ${textValue('OY', '')}
    ${textValue('OSIZE', '')}
    ${Object.keys(NUMBER_DEFAULTS).map(numberValue).join('')}
    <field name="EASE">Expo</field>
    <field name="DIRECTION">${DIRECTIONS[0]}</field>
</block>`;

const toBoolean = value => value === true || value === 1 || String(value).toLowerCase() === 'true';

exports.activate = shading => {
    const {ArgumentType, BlockType, Cast} = shading.scratch;
    const objects = shading.objects;
    const locale = shading.l10n.getLocale();
    const number = name => ({type: ArgumentType.NUMBER, defaultValue: NUMBER_DEFAULTS[name]});
    const measure = (font, char) => objects.measureText(font, char);
    const helpers = {hash: objects.hash, easeValue: shading.easing.value};

    const lyricMotion = (args, util) => {
        const time = objects.posterizeTime(objects.getTime(util), objects.getFramerate());
        const glyphs = layoutLine({
            text: Cast.toString(args.CHAR),
            font: Cast.toString(args.FONT) || DEFAULT_FONT,
            kanjiFont: Cast.toString(args.KANJI_FONT) || DEFAULT_KANJI_FONT,
            size: Cast.toNumber(args.SIZE),
            textSize: Cast.toNumber(args.TEXT_SIZE),
            kanjiSize: Cast.toNumber(args.KANJI_SIZE),
            spacing: Cast.toNumber(args.SPACING),
            direction: args.DIRECTION,
            offsetX: args.OX,
            offsetY: args.OY,
            offsetSize: args.OSIZE,
            em: objects.TEXT_SIZE,
            measure
        });
        // Blocks saved before the color input existed keep their black text.
        const color = typeof args.COLOR === 'undefined' ? DEFAULT_COLOR : args.COLOR;
        const params = {
            radius: Cast.toNumber(args.RADIUS),
            ease: args.EASE,
            speed: Cast.toNumber(args.SPEED),
            start: Cast.toNumber(args.T1),
            end: args.T2 === Infinity || String(args.T2) === 'Infinity' ? Infinity : Cast.toNumber(args.T2),
            interval: Cast.toNumber(args.INTERVAL),
            clip: toBoolean(args.CLIP),
            randomness: Cast.toNumber(args.RANDOMNESS),
            fps: Cast.toNumber(args.FPS),
            shakeSpeed: Cast.toNumber(args.SHAKE_SPEED),
            shakeX: Cast.toNumber(args.SHAKE_X),
            shakeY: Cast.toNumber(args.SHAKE_Y)
        };
        const seed = objects.getInstanceId(util);
        const px = Cast.toNumber(args.PX);
        const py = Cast.toNumber(args.PY);
        const pz = Cast.toNumber(args.PZ);
        for (const glyph of glyphs) {
            const offset = glyphOffset(glyph, params, time, helpers, seed);
            if (!offset) continue;
            objects.draw(util, {
                source: 'text',
                asset: glyph.font,
                text: glyph.char,
                italic: 0,
                color,
                frame: 1,
                speed: 1,
                volume: 100,
                videoMode: 'sequence',
                position: {x: px + glyph.x + offset.x, y: py + glyph.y + offset.y, z: pz},
                rotation: {x: 0, y: 0, z: glyph.rotation},
                scale: {x: 1, y: 1, z: 1},
                size: glyph.size,
                width: 100,
                height: 100
            });
        }
    };

    const text = shading.l10n.localize(locale,
        'Lyric motion char: [CHAR] font: [FONT] kanji font: [KANJI_FONT] color: [COLOR] ' +
            'offset: [OX] [OY] [OSIZE] ' +
            'radius: [RADIUS] ease: [EASE] elastic speed: [SPEED] position: [PX] [PY] [PZ] ' +
            'size: [SIZE] direction: [DIRECTION] text size: [TEXT_SIZE] kanji size: [KANJI_SIZE] ' +
            'spacing: [SPACING] time: [T1] [T2] time interval: [INTERVAL] clip: [CLIP] ' +
            'randomness position offset: [RANDOMNESS] posterize fps: [FPS] ' +
            'shake speed: [SHAKE_SPEED] shake radius x: [SHAKE_X] shake radius y: [SHAKE_Y]',
        'リリックモーション char: [CHAR] font: [FONT] kanji font: [KANJI_FONT] color: [COLOR] ' +
            'offset: [OX] [OY] [OSIZE] ' +
            'radius: [RADIUS] ease: [EASE] elastic speed: [SPEED] position: [PX] [PY] [PZ] ' +
            'size: [SIZE] direction: [DIRECTION] text size: [TEXT_SIZE] kanji size: [KANJI_SIZE] ' +
            'spacing: [SPACING] time: [T1] [T2] time interval: [INTERVAL] clip: [CLIP] ' +
            'randomness position offset: [RANDOMNESS] posterize fps: [FPS] ' +
            'shake speed: [SHAKE_SPEED] shake radius x: [SHAKE_X] shake radius y: [SHAKE_Y]');

    objects.addBlocks({
        blocks: [{
            opcode: OPCODE,
            blockType: BlockType.COMMAND,
            text,
            arguments: {
                CHAR: {type: ArgumentType.STRING, defaultValue: '歌詞が飛び込む'},
                FONT: {type: ArgumentType.STRING, menu: FONT_MENU, defaultValue: DEFAULT_FONT},
                KANJI_FONT: {type: ArgumentType.STRING, menu: FONT_MENU, defaultValue: DEFAULT_KANJI_FONT},
                COLOR: {type: ArgumentType.COLOR, defaultValue: DEFAULT_COLOR},
                OX: {type: ArgumentType.STRING, defaultValue: ''},
                OY: {type: ArgumentType.STRING, defaultValue: ''},
                OSIZE: {type: ArgumentType.STRING, defaultValue: ''},
                RADIUS: number('RADIUS'),
                EASE: {type: ArgumentType.STRING, menu: 'lyricMotionEase', defaultValue: 'Expo'},
                SPEED: number('SPEED'),
                PX: number('PX'),
                PY: number('PY'),
                PZ: number('PZ'),
                SIZE: number('SIZE'),
                DIRECTION: {type: ArgumentType.STRING, menu: 'lyricMotionDirection', defaultValue: DIRECTIONS[0]},
                TEXT_SIZE: number('TEXT_SIZE'),
                KANJI_SIZE: number('KANJI_SIZE'),
                SPACING: number('SPACING'),
                T1: number('T1'),
                T2: number('T2'),
                INTERVAL: number('INTERVAL'),
                CLIP: {type: ArgumentType.BOOLEAN},
                RANDOMNESS: number('RANDOMNESS'),
                FPS: number('FPS'),
                SHAKE_SPEED: number('SHAKE_SPEED'),
                SHAKE_X: number('SHAKE_X'),
                SHAKE_Y: number('SHAKE_Y')
            }
        }],
        menus: {
            [FONT_MENU]: {
                acceptReporters: true,
                items: () => objects.getFonts().map(font => ({text: font.name, value: font.value}))
            },
            lyricMotionEase: {acceptReporters: false, items: EASE_TYPES.slice()},
            lyricMotionDirection: {acceptReporters: false, items: DIRECTIONS.slice()}
        },
        methods: {[OPCODE]: lyricMotion},
        toolboxXML
    });

    // The generated block is one long line; break it into rows like the draw block.
    shading.blocks.define('objects', ScratchBlocks => {
        const definition = ScratchBlocks.Blocks[`objects_${OPCODE}`];
        if (!definition || definition.lyricMotionRows) return;
        const init = definition.init;
        definition.init = function () {
            init.call(this);
            shading.ui.useBlockRows(ScratchBlocks, this, ROW_STARTS);
        };
        definition.lyricMotionRows = true;
    });
};
