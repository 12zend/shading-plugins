'use strict';

// Splits a drawn frame into pieces the way blob detection finds blobs: every pixel with alpha is keyed, and each
// eight-connected region becomes one piece. A piece keeps its own pixels (premultiplied RGBA, rows bottom-up like
// WebGL readPixels), its centroid, its mass properties and a convex hull for collisions.
//
// Pixel coordinates are buffer pixels with y up (row 0 is the bottom row). Physics uses stage units with the origin
// at the stage centre: a buffer pixel is 1 / pixelScale stage units.

const MAX_HULL_VERTICES = 16;

const clampInteger = (value, minimum, maximum, fallback) => {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return fallback;
    return Math.max(minimum, Math.min(maximum, number));
};

// FNV-1a over 32-bit words: detects when the drawn content changes so pieces and simulations can be reused.
const hashFrame = frame => {
    const data = frame.data;
    let hash = 0x811c9dc5 ^ frame.width ^ (frame.height << 16);
    const aligned = data.byteOffset % 4 === 0 && data.byteLength % 4 === 0;
    if (aligned) {
        const words = new Uint32Array(data.buffer, data.byteOffset, data.byteLength / 4);
        for (let index = 0; index < words.length; index++) {
            hash = Math.imul(hash ^ words[index], 0x01000193);
        }
    } else {
        for (let index = 0; index < data.length; index++) {
            hash = Math.imul(hash ^ data[index], 0x01000193);
        }
    }
    return hash >>> 0;
};

const cross = (o, a, b) => ((a[0] - o[0]) * (b[1] - o[1])) - ((a[1] - o[1]) * (b[0] - o[0]));

// Andrew's monotone chain. Returns the hull counter-clockwise (y up) without repeated points.
const convexHull = points => {
    const sorted = points.slice().sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
    const unique = [];
    for (const point of sorted) {
        const last = unique[unique.length - 1];
        if (!last || last[0] !== point[0] || last[1] !== point[1]) unique.push(point);
    }
    if (unique.length < 3) return unique;
    const lower = [];
    for (const point of unique) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
        lower.push(point);
    }
    const upper = [];
    for (let index = unique.length - 1; index >= 0; index--) {
        const point = unique[index];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
        upper.push(point);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
};

// Drop the vertices that change the hull least until at most `limit` remain (Visvalingam). The result stays convex.
const simplifyHull = (hull, limit) => {
    const vertices = hull.slice();
    while (vertices.length > limit) {
        let smallest = Infinity;
        let removeAt = 0;
        for (let index = 0; index < vertices.length; index++) {
            const previous = vertices[(index + vertices.length - 1) % vertices.length];
            const next = vertices[(index + 1) % vertices.length];
            const area = Math.abs(cross(previous, vertices[index], next));
            if (area < smallest) {
                smallest = area;
                removeAt = index;
            }
        }
        vertices.splice(removeAt, 1);
    }
    return vertices;
};

/**
 * Find the pieces of a frame.
 * @param {{data: Uint8Array, width: number, height: number}} frame Premultiplied RGBA, rows bottom-up.
 * @param {object} options {pixelScale (buffer pixels per stage unit), threshold (alpha 0-255), maxPieces}.
 * @returns {object[]} Pieces in scan order (bottom row first), each with
 *     {id, minX, minY, width, height, pixels, centerX, centerY, mass, inertia, hull}. centerX/Y are buffer pixels;
 *     mass, inertia and the hull (relative to the centroid, counter-clockwise) are in stage units.
 */
const extractPieces = (frame, options = {}) => {
    const width = frame.width;
    const height = frame.height;
    const data = frame.data;
    const pixelScale = Number(options.pixelScale) > 0 ? Number(options.pixelScale) : 1;
    const threshold = clampInteger(options.threshold, 1, 255, 1);
    const maxPieces = clampInteger(options.maxPieces, 1, 100000, 2000);
    const count = width * height;
    // 0 = empty, 1 = keyed and unvisited, then visited.
    const mask = new Uint8Array(count);
    for (let index = 0, offset = 3; index < count; index++, offset += 4) {
        if (data[offset] >= threshold) mask[index] = 1;
    }

    const stack = new Int32Array(count);
    const order = new Int32Array(count);
    let orderLength = 0;
    const regions = [];
    for (let start = 0; start < count; start++) {
        if (mask[start] !== 1) continue;
        mask[start] = 2;
        let head = 0;
        let tail = 1;
        stack[0] = start;
        const first = orderLength;
        let minX = start % width;
        let maxX = minX;
        let minY = (start - minX) / width;
        let maxY = minY;
        while (head < tail) {
            const index = stack[head++];
            order[orderLength++] = index;
            const x = index % width;
            const y = (index - x) / width;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            const left = x > 0;
            const right = x + 1 < width;
            const down = y > 0;
            const up = y + 1 < height;
            // Eight neighbours, so diagonal strokes and antialiased edges stay in one piece.
            if (left && mask[index - 1] === 1) {
                mask[index - 1] = 2;
                stack[tail++] = index - 1;
            }
            if (right && mask[index + 1] === 1) {
                mask[index + 1] = 2;
                stack[tail++] = index + 1;
            }
            if (down) {
                const below = index - width;
                if (mask[below] === 1) {
                    mask[below] = 2;
                    stack[tail++] = below;
                }
                if (left && mask[below - 1] === 1) {
                    mask[below - 1] = 2;
                    stack[tail++] = below - 1;
                }
                if (right && mask[below + 1] === 1) {
                    mask[below + 1] = 2;
                    stack[tail++] = below + 1;
                }
            }
            if (up) {
                const above = index + width;
                if (mask[above] === 1) {
                    mask[above] = 2;
                    stack[tail++] = above;
                }
                if (left && mask[above - 1] === 1) {
                    mask[above - 1] = 2;
                    stack[tail++] = above - 1;
                }
                if (right && mask[above + 1] === 1) {
                    mask[above + 1] = 2;
                    stack[tail++] = above + 1;
                }
            }
        }
        regions.push({start, first, length: orderLength - first, minX, maxX, minY, maxY});
    }

    // Keep the largest regions when there are too many; the rest are not drawn.
    let kept = regions;
    if (regions.length > maxPieces) {
        kept = regions.slice()
            .sort((a, b) => (b.length - a.length) || (a.start - b.start))
            .slice(0, maxPieces)
            .sort((a, b) => a.start - b.start);
    }

    const unit = 1 / pixelScale;
    const pixelArea = unit * unit;
    return kept.map((region, id) => {
        const pieceWidth = region.maxX - region.minX + 1;
        const pieceHeight = region.maxY - region.minY + 1;
        const pixels = new Uint8Array(pieceWidth * pieceHeight * 4);
        const rowMin = new Int32Array(pieceHeight).fill(pieceWidth);
        const rowMax = new Int32Array(pieceHeight).fill(-1);
        let sumX = 0;
        let sumY = 0;
        for (let k = region.first; k < region.first + region.length; k++) {
            const index = order[k];
            const x = index % width;
            const y = (index - x) / width;
            const localX = x - region.minX;
            const localY = y - region.minY;
            const source = index * 4;
            const target = ((localY * pieceWidth) + localX) * 4;
            pixels[target] = data[source];
            pixels[target + 1] = data[source + 1];
            pixels[target + 2] = data[source + 2];
            pixels[target + 3] = data[source + 3];
            if (localX < rowMin[localY]) rowMin[localY] = localX;
            if (localX > rowMax[localY]) rowMax[localY] = localX;
            sumX += x + 0.5;
            sumY += y + 0.5;
        }
        const centerX = sumX / region.length;
        const centerY = sumY / region.length;
        // Moment of inertia about the centroid, density 1 per stage unit squared; each pixel is a small square.
        let moment = 0;
        for (let k = region.first; k < region.first + region.length; k++) {
            const index = order[k];
            const x = index % width;
            const y = (index - x) / width;
            const dx = (x + 0.5 - centerX) * unit;
            const dy = (y + 0.5 - centerY) * unit;
            moment += (dx * dx) + (dy * dy);
        }
        const mass = region.length * pixelArea;
        const inertia = (moment * pixelArea) + (mass * pixelArea / 6);

        const corners = [];
        for (let row = 0; row < pieceHeight; row++) {
            if (rowMax[row] < 0) continue;
            const y0 = region.minY + row;
            const left = region.minX + rowMin[row];
            const right = region.minX + rowMax[row] + 1;
            corners.push([left, y0], [left, y0 + 1], [right, y0], [right, y0 + 1]);
        }
        const hull = simplifyHull(convexHull(corners), MAX_HULL_VERTICES)
            .map(([x, y]) => [(x - centerX) * unit, (y - centerY) * unit]);
        return {
            id,
            minX: region.minX,
            minY: region.minY,
            width: pieceWidth,
            height: pieceHeight,
            pixels,
            centerX,
            centerY,
            mass,
            inertia,
            hull
        };
    });
};

module.exports = {convexHull, extractPieces, hashFrame, simplifyHull};
