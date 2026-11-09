'use strict';

// Layout and motion of a lyric line, kept free of the editor so it can be tested on its own.

// Kanji (and the marks that behave like them) use the kanji font and kanji size.
const KANJI = /[\p{Script=Han}々〆〇ヶヵ]/u;
// Marks that are drawn turned a quarter clockwise when the line reads vertically.
const TURNED_IN_VERTICAL = new Set(Array.from('ー－—―‐-~～〜…‥()（）[]［］{}｛｝「」『』【】〈〉《》<>＜＞=＝'));
const WHITESPACE = /^\s$/u;
const EASE_TYPES = ['Power', 'Expo', 'Circ'];
const DIRECTIONS = ['horizontal reading', 'vertical reading'];

const finite = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const normalizeEase = value => {
    const lower = String(value || '').toLowerCase();
    return EASE_TYPES.find(type => type.toLowerCase() === lower) || EASE_TYPES[0];
};

const isVertical = direction => String(direction || '').toLowerCase() === DIRECTIONS[1];

const isKanji = char => KANJI.test(char);

/**
 * Read a list of per-character numbers such as "0 10 5 -3 4" (spaces, commas or both separate them).
 * @param {*} value Text, a number or an array.
 * @returns {Array<number>} The numbers; an entry that is not a number is 0.
 */
const parseOffsets = value => {
    if (Array.isArray(value)) return value.map(entry => finite(entry));
    if (value === null || typeof value === 'undefined') return [];
    return String(value).split(/[\s,、，]+/u).filter(part => part !== '').map(part => finite(part));
};

/**
 * Place the characters of a line around (0, 0).
 * @param {object} options Layout options.
 * @param {string} options.text The lyric.
 * @param {string} options.font Font of the other characters.
 * @param {string} options.kanjiFont Font of kanji.
 * @param {number} options.size Size of the whole line (%).
 * @param {number} options.textSize Size of the other characters (% of size).
 * @param {number} options.kanjiSize Size of kanji (% of size).
 * @param {number} options.spacing Extra space between characters, in stage units.
 * @param {string} options.direction 'horizontal reading' or 'vertical reading'.
 * @param {number} options.em Height of a character at size 100.
 * @param {Function} options.measure (font, char) => width at size 100 (0 when unknown).
 * @param {*} [options.offsetX] Per drawn character, stage units added to x (see parseOffsets).
 * @param {*} [options.offsetY] Per drawn character, stage units added to y.
 * @param {*} [options.offsetSize] Per drawn character, added to its size. It does not change the spacing.
 * @returns {Array<object>} {char, font, size, x, y, rotation, index} per drawn character; index counts only them.
 */
const layoutLine = options => {
    const vertical = isVertical(options.direction);
    const em = finite(options.em, 48);
    const spacing = finite(options.spacing);
    const lineScale = finite(options.size, 100) / 100;
    const items = Array.from(String(options.text)).filter(char => char !== '\n' && char !== '\r').map(char => {
        const kanji = isKanji(char);
        const size = lineScale * finite(kanji ? options.kanjiSize : options.textSize, 100);
        const scale = size / 100;
        const font = kanji ? options.kanjiFont : options.font;
        let advance = em * scale;
        if (!vertical) {
            const measured = finite(options.measure ? options.measure(font, char) : 0);
            if (measured > 0) advance = measured * scale;
            else if (char.charCodeAt(0) < 0x2000) advance = em * scale / 2;
        }
        return {char, font, size, advance};
    });
    const length = items.reduce((total, item) => total + item.advance, 0) +
        (spacing * Math.max(0, items.length - 1));
    let cursor = -length / 2;
    let index = 0;
    const offsetX = parseOffsets(options.offsetX);
    const offsetY = parseOffsets(options.offsetY);
    const offsetSize = parseOffsets(options.offsetSize);
    const glyphs = [];
    for (const item of items) {
        const center = cursor + (item.advance / 2);
        cursor += item.advance + spacing;
        if (WHITESPACE.test(item.char)) continue;
        glyphs.push({
            char: item.char,
            font: item.font,
            size: Math.max(0, item.size + (offsetSize[index] || 0)),
            x: (vertical ? 0 : center) + (offsetX[index] || 0),
            y: (vertical ? -center : 0) + (offsetY[index] || 0),
            rotation: vertical && TURNED_IN_VERTICAL.has(item.char) ? -90 : 0,
            index: index++
        });
    }
    return glyphs;
};

// Deterministic random numbers in [0, 1) from a 32-bit seed (mulberry32).
const random = seed => {
    let value = (seed + 0x6D2B79F5) >>> 0;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
};

/**
 * Where a character is at a time, relative to its place in the line.
 * @param {object} glyph From layoutLine.
 * @param {object} params Block values: radius, ease, speed, start, end, interval, clip, randomness, fps,
 *     shakeSpeed, shakeX, shakeY.
 * @param {number} time Seconds (already posterized to the project framerate).
 * @param {object} helpers {hash(text), easeValue(options, time)} where easeValue is the easing block's calculation.
 * @param {string} seed Stable id of the block instance.
 * @returns {?{x: number, y: number}} Offset, or null while the character is hidden.
 */
const glyphOffset = (glyph, params, time, helpers, seed) => {
    const delay = glyph.index * finite(params.interval);
    const start = finite(params.start) + delay;
    const end = finite(params.end, Infinity) + delay;
    if (time < start || (params.clip && time > end)) return null;

    // Speed adds the easing block's elastic oscillation; at 0 the curve is the plain Out easing.
    const progress = helpers.easeValue({
        type: `${normalizeEase(params.ease)}Out`,
        v0: 0,
        v1: 1,
        t0: start,
        t1: end,
        power: 2,
        speed: finite(params.speed)
    }, time);
    const angle = random(helpers.hash(`${seed}:${glyph.index}:angle`)) * Math.PI * 2;
    const radius = finite(params.radius);
    let x = Math.cos(angle) * radius * (1 - progress);
    let y = Math.sin(angle) * radius * (1 - progress);

    const randomness = finite(params.randomness);
    if (randomness) {
        const fps = Math.abs(finite(params.fps));
        const step = fps > 0 ? Math.floor((time * fps) + 1e-9) : 0;
        x += ((random(helpers.hash(`${seed}:${glyph.index}:${step}:x`)) * 2) - 1) * randomness;
        y += ((random(helpers.hash(`${seed}:${glyph.index}:${step}:y`)) * 2) - 1) * randomness;
    }

    const shakeSpeed = finite(params.shakeSpeed);
    x += Math.cos(time * shakeSpeed) * finite(params.shakeX);
    y += Math.sin(time * shakeSpeed) * finite(params.shakeY);
    return {x, y};
};

module.exports = {
    DIRECTIONS,
    EASE_TYPES,
    glyphOffset,
    isKanji,
    layoutLine,
    normalizeEase,
    parseOffsets,
    random
};
