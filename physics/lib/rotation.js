// Rotations in Shading's convention: degrees about X, then Y, then Z (R = Rz * Ry * Rx), like the draw and
// transform blocks. Multiples of 90 degrees use exact sines and cosines, so the common orientations do not depend
// on the browser's Math.sin.

const HALF_TURN_SINES = [0, Math.SQRT1_2, 1, Math.SQRT1_2, 0, -Math.SQRT1_2, -1, -Math.SQRT1_2];

const halfAngle = degrees => {
    const half = Number(degrees) / 2;
    const steps = half / 45;
    if (Number.isInteger(steps)) {
        const index = ((steps % 8) + 8) % 8;
        return {sin: HALF_TURN_SINES[index], cos: HALF_TURN_SINES[(index + 2) % 8]};
    }
    const radians = half * Math.PI / 180;
    return {sin: Math.sin(radians), cos: Math.cos(radians)};
};

const multiply = (a, b) => ({
    x: (a.w * b.x) + (a.x * b.w) + (a.y * b.z) - (a.z * b.y),
    y: (a.w * b.y) - (a.x * b.z) + (a.y * b.w) + (a.z * b.x),
    z: (a.w * b.z) + (a.x * b.y) - (a.y * b.x) + (a.z * b.w),
    w: (a.w * b.w) - (a.x * b.x) - (a.y * b.y) - (a.z * b.z)
});

const eulerToQuaternion = rotation => {
    const x = halfAngle(rotation.x || 0);
    const y = halfAngle(rotation.y || 0);
    const z = halfAngle(rotation.z || 0);
    return multiply(multiply({x: 0, y: 0, z: z.sin, w: z.cos}, {x: 0, y: y.sin, z: 0, w: y.cos}),
        {x: x.sin, y: 0, z: 0, w: x.cos});
};

const toDegrees = radians => radians * 180 / Math.PI;

const quaternionToEuler = q => {
    const {x, y, z, w} = q;
    const r20 = 2 * ((x * z) - (w * y));
    if (Math.abs(r20) >= 1 - 1e-12) {
        // Gimbal lock: Y is +-90 degrees; put the remaining rotation on Z.
        const r01 = 2 * ((x * y) - (w * z));
        const r11 = 1 - (2 * ((x * x) + (z * z)));
        return {x: 0, y: r20 < 0 ? 90 : -90, z: toDegrees(Math.atan2(-r01, r11))};
    }
    return {
        x: toDegrees(Math.atan2(2 * ((y * z) + (w * x)), 1 - (2 * ((x * x) + (y * y))))),
        y: toDegrees(Math.asin(-r20)),
        z: toDegrees(Math.atan2(2 * ((x * y) + (w * z)), 1 - (2 * ((y * y) + (z * z)))))
    };
};

module.exports = {eulerToQuaternion, quaternionToEuler};
