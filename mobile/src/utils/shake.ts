/** One accelerometer reading, in g (1 g is gravity, 9.81 m/s²). */
export type Acceleration = { x: number; y: number; z: number };

/** A phone lying still measures 1 g (gravity). A firm shake goes well above this. */
export const ShakeThresholdG = 1.8;
/** One shake gives many strong readings; count them as one. */
export const ShakeCooldownMs = 1500;

/** Total acceleration in any direction, so it works however the phone is held. */
export function accelerationStrength({ x, y, z }: Acceleration): number {
  return Math.sqrt(x * x + y * y + z * z);
}

/**
 * Returns a function to call with each reading. It answers true once per shake: when a reading is
 * strong enough and the last shake was at least `ShakeCooldownMs` ago.
 */
export function createShakeDetector(): (reading: Acceleration, nowMs: number) => boolean {
  let lastShakeAt = -Infinity;
  return (reading, nowMs) => {
    if (accelerationStrength(reading) < ShakeThresholdG || nowMs - lastShakeAt < ShakeCooldownMs) {
      return false;
    }
    lastShakeAt = nowMs;
    return true;
  };
}
