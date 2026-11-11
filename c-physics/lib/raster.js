'use strict';

// Draw pieces at their poses into a premultiplied RGBA buffer (rows bottom-up). Each output pixel samples the piece
// bilinearly, so rotated pieces keep smooth edges; at the starting pose a piece lands on exactly its own pixels.

/**
 * @param {Uint8Array} output Cleared output buffer of width * height * 4.
 * @param {number} width Buffer width.
 * @param {number} height Buffer height.
 * @param {object[]} pieces Pieces from extractPieces.
 * @param {Float64Array} poses Buffer-pixel x, y (of the centroid) and angle per piece.
 * @returns {Uint8Array} The output.
 */
const drawPieces = (output, width, height, pieces, poses) => {
    for (let index = 0; index < pieces.length; index++) {
        const piece = pieces[index];
        const px = poses[index * 3];
        const py = poses[(index * 3) + 1];
        const angle = poses[(index * 3) + 2];
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const localX = piece.centerX - piece.minX;
        const localY = piece.centerY - piece.minY;
        const pw = piece.width;
        const ph = piece.height;
        const pixels = piece.pixels;

        // Output pixels covered by the rotated piece rectangle.
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const [cx, cy] of [[0, 0], [pw, 0], [0, ph], [pw, ph]]) {
            const dx = cx - localX;
            const dy = cy - localY;
            const x = px + (cos * dx) - (sin * dy);
            const y = py + (sin * dx) + (cos * dy);
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
        const x0 = Math.max(0, Math.floor(minX - 1));
        const x1 = Math.min(width - 1, Math.ceil(maxX + 1));
        const y0 = Math.max(0, Math.floor(minY - 1));
        const y1 = Math.min(height - 1, Math.ceil(maxY + 1));
        if (x0 > x1 || y0 > y1) continue;

        const sample = (sx, sy, channel) => (
            sx < 0 || sy < 0 || sx >= pw || sy >= ph ? 0 : pixels[(((sy * pw) + sx) * 4) + channel]
        );
        for (let y = y0; y <= y1; y++) {
            const dy = y + 0.5 - py;
            for (let x = x0; x <= x1; x++) {
                const dx = x + 0.5 - px;
                // Inverse rotation into the piece, then to pixel-centre coordinates for bilinear sampling.
                const sx = (cos * dx) + (sin * dy) + localX - 0.5;
                const sy = (-sin * dx) + (cos * dy) + localY - 0.5;
                if (sx <= -1 || sy <= -1 || sx >= pw || sy >= ph) continue;
                const ix = Math.floor(sx);
                const iy = Math.floor(sy);
                const fx = sx - ix;
                const fy = sy - iy;
                const w00 = (1 - fx) * (1 - fy);
                const w10 = fx * (1 - fy);
                const w01 = (1 - fx) * fy;
                const w11 = fx * fy;
                const alpha = (sample(ix, iy, 3) * w00) + (sample(ix + 1, iy, 3) * w10) +
                    (sample(ix, iy + 1, 3) * w01) + (sample(ix + 1, iy + 1, 3) * w11);
                if (alpha <= 0.001) continue;
                const offset = ((y * width) + x) * 4;
                const keep = 1 - (alpha / 255);
                for (let channel = 0; channel < 3; channel++) {
                    const value = (sample(ix, iy, channel) * w00) + (sample(ix + 1, iy, channel) * w10) +
                        (sample(ix, iy + 1, channel) * w01) + (sample(ix + 1, iy + 1, channel) * w11);
                    output[offset + channel] = Math.min(255, Math.round(value + (output[offset + channel] * keep)));
                }
                output[offset + 3] = Math.min(255, Math.round(alpha + (output[offset + 3] * keep)));
            }
        }
    }
    return output;
};

module.exports = {drawPieces};
