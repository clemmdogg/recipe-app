import { accelerationStrength, createShakeDetector, ShakeCooldownMs } from '@/utils/shake';

const still = { x: 0, y: 0, z: -1 };
const shake = { x: 2.2, y: 0.5, z: -1 };

describe('accelerationStrength', () => {
  it('is 1 g for a phone lying still, whichever way it lies', () => {
    expect(accelerationStrength(still)).toBe(1);
    expect(accelerationStrength({ x: 1, y: 0, z: 0 })).toBe(1);
  });
});

describe('createShakeDetector', () => {
  it('ignores a phone lying still or moved gently', () => {
    const isShake = createShakeDetector();

    expect(isShake(still, 0)).toBe(false);
    expect(isShake({ x: 0.4, y: 0.3, z: -1.1 }, 100)).toBe(false);
  });

  it('notices a firm shake', () => {
    expect(createShakeDetector()(shake, 0)).toBe(true);
  });

  it('counts the strong readings of one shake as a single shake', () => {
    const isShake = createShakeDetector();

    expect(isShake(shake, 1000)).toBe(true);
    expect(isShake(shake, 1100)).toBe(false);
    expect(isShake(shake, 1000 + ShakeCooldownMs - 1)).toBe(false);
    expect(isShake(shake, 1000 + ShakeCooldownMs)).toBe(true);
  });
});
