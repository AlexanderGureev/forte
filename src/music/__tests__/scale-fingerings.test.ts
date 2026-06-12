import { describe, expect, it } from 'vitest';
import { buildScaleFingering, buildScaleFingeringSet } from '../fingerings';
import { getSupportedKeys, resolveKey } from '../keys';
import { buildScale } from '../scales';
import type { KeySelection, ScaleFingeringDirection, ScaleFingeringHand } from '../types';

function fingering(
  keySelection: KeySelection,
  hand: ScaleFingeringHand,
  direction: ScaleFingeringDirection
) {
  const key = resolveKey(keySelection);

  return buildScaleFingering({
    key,
    scale: buildScale(key),
    hand,
    direction
  });
}

describe('buildScaleFingering', () => {
  it('builds the standard one-octave right-hand C Major fingering', () => {
    const model = fingering('C Major', 'right', 'ascending');

    expect(model.steps.map((step) => step.scaleNote.name)).toEqual([
      'C',
      'D',
      'E',
      'F',
      'G',
      'A',
      'B',
      'C'
    ]);
    expect(model.steps.map((step) => step.finger)).toEqual([1, 2, 3, 1, 2, 3, 4, 5]);
    expect(model.steps.map((step) => step.octaveOffset)).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
    expect(model).toMatchObject({
      patternLabel: '1-2-3-1-2-3-4-5'
    });
  });

  it('reverses the one-octave pattern for descending direction', () => {
    const model = fingering('C Major', 'right', 'descending');

    expect(model.steps.map((step) => step.scaleNote.name)).toEqual([
      'C',
      'B',
      'A',
      'G',
      'F',
      'E',
      'D',
      'C'
    ]);
    expect(model.steps.map((step) => step.finger)).toEqual([5, 4, 3, 2, 1, 3, 2, 1]);
    expect(model.steps.map((step) => step.octaveOffset)).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('keeps black-key scale fingerings explicit instead of deriving a white-key pattern', () => {
    expect(fingering('C# Major', 'right', 'ascending')).toMatchObject({
      patternLabel: '2-3-1-2-3-4-1-2'
    });
    expect(fingering('A# Minor', 'left', 'ascending')).toMatchObject({
      patternLabel: '2-1-3-2-1-4-3-2'
    });
  });

  it('covers every supported major and natural minor key for both hands and directions', () => {
    for (const key of getSupportedKeys()) {
      const models = buildScaleFingeringSet({ key, scale: buildScale(key) });

      expect(models).toHaveLength(4);

      for (const model of models) {
        expect(model.steps).toHaveLength(8);
        expect(model.steps[0].scaleNote.name).toBe(key.tonic);
        expect(model.steps[7].scaleNote.name).toBe(key.tonic);
        expect(model.patternLabel.split('-')).toHaveLength(8);
      }
    }
  });
});
