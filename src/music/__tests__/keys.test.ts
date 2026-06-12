import { describe, expect, it } from 'vitest';
import {
  getEnharmonicOptionsForPitchClass,
  getSupportedKeys,
  RECOMMENDED_KEYS,
  resolveKey,
  SUPPORTED_MAJOR_KEYS,
  SUPPORTED_NATURAL_MINOR_KEYS
} from '../keys';
import type { KeySelection, Mode, PhysicalPitchClass } from '../types';

const expectedMajorKeys = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'C#',
  'F',
  'Bb',
  'Eb',
  'Ab',
  'Db',
  'Gb',
  'Cb'
];

const expectedNaturalMinorKeys = [
  'A',
  'E',
  'B',
  'F#',
  'C#',
  'G#',
  'D#',
  'A#',
  'D',
  'G',
  'C',
  'F',
  'Bb',
  'Eb',
  'Ab'
];

describe('supported key whitelist', () => {
  it('exposes the supported major and natural minor tonics in specification order', () => {
    expect(SUPPORTED_MAJOR_KEYS).toEqual(expectedMajorKeys);
    expect(SUPPORTED_NATURAL_MINOR_KEYS).toEqual(expectedNaturalMinorKeys);
  });

  it('does not expose double accidental tonics', () => {
    const allTonicNames = [...SUPPORTED_MAJOR_KEYS, ...SUPPORTED_NATURAL_MINOR_KEYS];

    expect(allTonicNames.every((tonic) => !tonic.includes('##') && !tonic.includes('bb'))).toBe(
      true
    );
  });

  it('builds supported key definitions without promoting rare white-key spellings to recommended', () => {
    const supportedMajorIds = getSupportedKeys('major').map((key) => key.id);
    const cFlatMajor = resolveKey('Cb Major');

    expect(supportedMajorIds).toContain('Cb Major');
    expect(cFlatMajor.physicalPitchClass).toBe(11);
    expect(cFlatMajor.recommended).toBe(false);
  });
});

describe('resolveKey', () => {
  it('returns recommended key definitions with spelling and key signature metadata', () => {
    const cMajor = resolveKey('C Major');
    const dMinor = resolveKey({ tonic: 'D', mode: 'naturalMinor' });

    expect(RECOMMENDED_KEYS).toContain(cMajor.id);
    expect(cMajor).toMatchObject({
      id: 'C Major',
      tonic: 'C',
      mode: 'major',
      physicalPitchClass: 0,
      signsCount: 0,
      difficulty: 'easy',
      recommended: true,
      displayName: 'C Major'
    });
    expect(cMajor.keySignature).toEqual({ accidental: 'natural', count: 0, notes: [] });

    expect(RECOMMENDED_KEYS).toContain(dMinor.id);
    expect(dMinor).toMatchObject({
      id: 'D Minor',
      tonic: 'D',
      mode: 'naturalMinor',
      physicalPitchClass: 2,
      signsCount: 1,
      difficulty: 'easy',
      recommended: true,
      displayName: 'D Minor'
    });
    expect(dMinor.keySignature).toEqual({ accidental: 'flat', count: 1, notes: ['B'] });
  });

  it('returns advanced key definitions for seven-sign keys', () => {
    const cSharpMajor = resolveKey('C# Major');
    const aSharpMinor = resolveKey('A# Minor');

    expect(cSharpMajor).toMatchObject({
      physicalPitchClass: 1,
      signsCount: 7,
      difficulty: 'advanced',
      recommended: false
    });
    expect(cSharpMajor.keySignature).toEqual({
      accidental: 'sharp',
      count: 7,
      notes: ['F', 'C', 'G', 'D', 'A', 'E', 'B']
    });

    expect(aSharpMinor).toMatchObject({
      physicalPitchClass: 10,
      signsCount: 7,
      difficulty: 'advanced',
      recommended: false
    });
    expect(aSharpMinor.keySignature).toEqual({
      accidental: 'sharp',
      count: 7,
      notes: ['F', 'C', 'G', 'D', 'A', 'E', 'B']
    });
  });

  it('rejects unsupported keys and double accidental tonics with clear errors', () => {
    expect(() => resolveKey('G# Major' as KeySelection)).toThrow(
      /Unsupported key "G# Major".*Supported major tonics/
    );
    expect(() => resolveKey('F## Major' as KeySelection)).toThrow(
      /Double accidentals are not supported/
    );
  });
});

describe('key difficulty', () => {
  it.each([
    ['C Major', 'easy'],
    ['G Major', 'easy'],
    ['D Major', 'medium'],
    ['A Major', 'medium'],
    ['E Major', 'advanced'],
    ['F Minor', 'advanced']
  ] as const)('classifies %s by signs count as %s', (keyId, expectedDifficulty) => {
    expect(resolveKey(keyId).difficulty).toBe(expectedDifficulty);
  });
});

describe('getEnharmonicOptionsForPitchClass', () => {
  it.each([
    [1, 'major', ['C# Major', 'Db Major']],
    [1, 'naturalMinor', ['C# Minor']],
    [6, 'major', ['F# Major', 'Gb Major']],
    [6, 'naturalMinor', ['F# Minor']],
    [10, 'major', ['Bb Major']],
    [10, 'naturalMinor', ['A# Minor', 'Bb Minor']]
  ] as const)(
    'filters pitch class %i options by %s whitelist',
    (pitchClass: PhysicalPitchClass, mode: Mode, expectedIds: readonly string[]) => {
      expect(getEnharmonicOptionsForPitchClass(pitchClass, mode).map((key) => key.id)).toEqual(
        expectedIds
      );
    }
  );
});
