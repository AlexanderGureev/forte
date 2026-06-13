import { describe, expect, it } from 'vitest';
import { getStudioCameraPlacement, type StudioCameraPlacement } from '../camera';

describe('studio camera placement', () => {
  it('scales camera distance while preserving the target', () => {
    const neutral = getStudioCameraPlacement(32, 16 / 9, 'desktop', 1440, 628, 1);
    const zoomedIn = getStudioCameraPlacement(32, 16 / 9, 'desktop', 1440, 628, 1.25);
    const zoomedOut = getStudioCameraPlacement(32, 16 / 9, 'desktop', 1440, 628, 0.8);

    expect(zoomedIn.target).toEqual(neutral.target);
    expect(zoomedOut.target).toEqual(neutral.target);
    expect(getCameraDistance(zoomedIn)).toBeCloseTo(getCameraDistance(neutral) / 1.25);
    expect(getCameraDistance(zoomedOut)).toBeCloseTo(getCameraDistance(neutral) / 0.8);
  });
});

function getCameraDistance(placement: StudioCameraPlacement): number {
  const [positionX, positionY, positionZ] = placement.position;
  const [targetX, targetY, targetZ] = placement.target;

  return Math.hypot(positionX - targetX, positionY - targetY, positionZ - targetZ);
}
