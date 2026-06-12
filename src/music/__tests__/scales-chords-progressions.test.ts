import { describe, expect, it } from 'vitest';
import { CHORD_FORMULAS, buildDiatonicTriads } from '../chords';
import { resolveKey } from '../keys';
import { buildScale } from '../scales';
import {
  getProgressionPresets,
  getRelativeKey,
  materializeProgression
} from '../progressions';
import type { KeySelection, Mode, ProgressionId } from '../types';

function scaleNoteNames(keySelection: KeySelection): readonly string[] {
  return buildScale(resolveKey(keySelection)).notes.map((note) => note.name);
}

function chordNames(keySelection: KeySelection): readonly string[] {
  return buildDiatonicTriads(resolveKey(keySelection)).map((chord) => chord.name);
}

function progressionChordNames(
  keySelection: KeySelection,
  progressionId: ProgressionId
): readonly string[] {
  return materializeProgression(resolveKey(keySelection), progressionId).steps.map(
    (step) => step.chordName
  );
}

function progressionRomanDegrees(
  keySelection: KeySelection,
  progressionId: ProgressionId
): readonly string[] {
  return materializeProgression(resolveKey(keySelection), progressionId).steps.map(
    (step) => step.romanDegree
  );
}

function hasDoubleAccidental(noteName: string): boolean {
  return noteName.includes('##') || noteName.includes('bb');
}

describe('buildScale', () => {
  it.each([
    ['C Major', ['C', 'D', 'E', 'F', 'G', 'A', 'B']],
    ['F Major', ['F', 'G', 'A', 'Bb', 'C', 'D', 'E']],
    ['Bb Major', ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A']],
    ['E Major', ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#']],
    ['F# Major', ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']],
    ['C# Major', ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#']],
    ['Cb Major', ['Cb', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb']]
  ] as const)('spells %s with the selected theoretical letters', (keyId, expectedNotes) => {
    const scale = buildScale(resolveKey(keyId));

    expect(scale.formula).toEqual(['W', 'W', 'H', 'W', 'W', 'W', 'H']);
    expect(scale.notes.map((note) => note.name)).toEqual(expectedNotes);
    expect(scale.notes.map((note) => note.degree)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it.each([
    ['A Minor', ['A', 'B', 'C', 'D', 'E', 'F', 'G']],
    ['D Minor', ['D', 'E', 'F', 'G', 'A', 'Bb', 'C']],
    ['F# Minor', ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E']],
    ['A# Minor', ['A#', 'B#', 'C#', 'D#', 'E#', 'F#', 'G#']],
    ['Bb Minor', ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'Ab']],
    ['Ab Minor', ['Ab', 'Bb', 'Cb', 'Db', 'Eb', 'Fb', 'Gb']]
  ] as const)('spells %s as natural minor', (keyId, expectedNotes) => {
    const scale = buildScale(resolveKey(keyId));

    expect(scale.formula).toEqual(['W', 'H', 'W', 'W', 'H', 'W', 'W']);
    expect(scale.notes.map((note) => note.name)).toEqual(expectedNotes);
  });

  it('keeps flat spelling in F Major instead of using the enharmonic sharp', () => {
    const notes = scaleNoteNames('F Major');

    expect(notes).toContain('Bb');
    expect(notes).not.toContain('A#');
  });

  it('spells seven-sharp and seven-flat major keys without double accidentals', () => {
    const cSharpMajor = scaleNoteNames('C# Major');
    const cFlatMajor = scaleNoteNames('Cb Major');

    expect(cSharpMajor).toEqual(['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#']);
    expect(cSharpMajor).toContain('E#');
    expect(cSharpMajor).toContain('B#');
    expect(cSharpMajor.some(hasDoubleAccidental)).toBe(false);

    expect(cFlatMajor).toEqual(['Cb', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb']);
    expect(cFlatMajor).toContain('Cb');
    expect(cFlatMajor).toContain('Fb');
    expect(cFlatMajor.some(hasDoubleAccidental)).toBe(false);
  });
});

describe('buildDiatonicTriads', () => {
  it('builds C Major triads with major-mode qualities and roman degrees', () => {
    const chords = buildDiatonicTriads(resolveKey('C Major'));

    expect(chordNames('C Major')).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
    expect(chords.map((chord) => chord.romanDegree)).toEqual([
      'I',
      'ii',
      'iii',
      'IV',
      'V',
      'vi',
      'vii°'
    ]);
    expect(chords.map((chord) => chord.quality)).toEqual([
      'major',
      'minor',
      'minor',
      'major',
      'major',
      'minor',
      'diminished'
    ]);
    expect(chords[6]).toMatchObject({
      name: 'Bdim',
      quality: 'diminished',
      romanDegree: 'vii°',
      tense: true
    });
  });

  it('builds A Natural Minor triads without raising the dominant', () => {
    const chords = buildDiatonicTriads(resolveKey('A Minor'));

    expect(chordNames('A Minor')).toEqual(['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G']);
    expect(chords.map((chord) => chord.romanDegree)).toEqual([
      'i',
      'ii°',
      'III',
      'iv',
      'v',
      'VI',
      'VII'
    ]);
    expect(chords[1]).toMatchObject({
      name: 'Bdim',
      quality: 'diminished',
      romanDegree: 'ii°',
      tense: true
    });
    expect(chords[4]).toMatchObject({ name: 'Em', quality: 'minor', romanDegree: 'v' });
  });

  it('exposes chord formula labels and semitone data for each supported quality', () => {
    expect(CHORD_FORMULAS.major).toMatchObject({
      quality: 'major',
      labels: ['1', '3', '5'],
      semitones: [0, 4, 7]
    });
    expect(CHORD_FORMULAS.minor).toMatchObject({
      quality: 'minor',
      labels: ['1', 'b3', '5'],
      semitones: [0, 3, 7]
    });
    expect(CHORD_FORMULAS.diminished).toMatchObject({
      quality: 'diminished',
      labels: ['1', 'b3', 'b5'],
      semitones: [0, 3, 6]
    });
  });
});

describe('progression presets', () => {
  it('exposes mode-specific preset ids in specification order', () => {
    expect(getProgressionPresets('major').map((preset) => preset.id)).toEqual([
      'loop-1',
      'classic',
      'cadence'
    ]);
    expect(getProgressionPresets('naturalMinor').map((preset) => preset.id)).toEqual([
      'minor-loop',
      'minor-basic',
      'descent'
    ]);
  });

  it('materializes major presets as real chord names, roman degrees, notes, and step indexes', () => {
    const cMajorLoop = materializeProgression(resolveKey('C Major'), 'loop-1');
    const fMajorClassic = materializeProgression(resolveKey('F Major'), 'classic');
    const eMajorCadence = materializeProgression(resolveKey('E Major'), 'cadence');

    expect(cMajorLoop.steps.map((step) => step.stepIndex)).toEqual([0, 1, 2, 3]);
    expect(cMajorLoop.steps.map((step) => step.chordName)).toEqual(['C', 'G', 'Am', 'F']);
    expect(cMajorLoop.steps.map((step) => step.romanDegree)).toEqual(['I', 'V', 'vi', 'IV']);
    expect(cMajorLoop.steps[0].notes.map((note) => note.name)).toEqual(['C', 'E', 'G']);
    expect(cMajorLoop.steps[2].notes.map((note) => note.name)).toEqual(['A', 'C', 'E']);

    expect(fMajorClassic.steps.map((step) => step.chordName)).toEqual(['F', 'Bb', 'C']);
    expect(fMajorClassic.steps.map((step) => step.romanDegree)).toEqual(['I', 'IV', 'V']);

    expect(eMajorCadence.steps.map((step) => step.chordName)).toEqual(['F#m', 'B', 'E']);
    expect(eMajorCadence.steps.map((step) => step.romanDegree)).toEqual(['ii', 'V', 'I']);
  });

  it('recalculates the same major progression structure for a changed key', () => {
    expect(progressionRomanDegrees('C Major', 'loop-1')).toEqual(['I', 'V', 'vi', 'IV']);
    expect(progressionRomanDegrees('F# Major', 'loop-1')).toEqual(['I', 'V', 'vi', 'IV']);
    expect(progressionChordNames('C Major', 'loop-1')).toEqual(['C', 'G', 'Am', 'F']);
    expect(progressionChordNames('F# Major', 'loop-1')).toEqual(['F#', 'C#', 'D#m', 'B']);
  });

  it('materializes natural minor presets without harmonic minor dominant substitution', () => {
    const aMinorLoop = materializeProgression(resolveKey('A Minor'), 'minor-loop');
    const dMinorBasic = materializeProgression(resolveKey('D Minor'), 'minor-basic');
    const fSharpMinorDescent = materializeProgression(resolveKey('F# Minor'), 'descent');

    expect(aMinorLoop.steps.map((step) => step.chordName)).toEqual(['Am', 'F', 'C', 'G']);
    expect(aMinorLoop.steps.map((step) => step.romanDegree)).toEqual(['i', 'VI', 'III', 'VII']);

    expect(dMinorBasic.steps.map((step) => step.chordName)).toEqual(['Dm', 'Gm', 'Am']);
    expect(dMinorBasic.steps.map((step) => step.romanDegree)).toEqual(['i', 'iv', 'v']);

    expect(fSharpMinorDescent.steps.map((step) => step.chordName)).toEqual([
      'F#m',
      'E',
      'D',
      'E'
    ]);
    expect(fSharpMinorDescent.steps.map((step) => step.romanDegree)).toEqual([
      'i',
      'VII',
      'VI',
      'VII'
    ]);
  });

  it('rejects unsupported progression ids and mode-incompatible presets with clear errors', () => {
    expect(() =>
      materializeProgression(resolveKey('C Major'), 'unknown' as ProgressionId)
    ).toThrow(/Unsupported progression id "unknown"/);
    expect(() => materializeProgression(resolveKey('A Minor'), 'loop-1')).toThrow(
      /Progression "loop-1" is major, but A Minor is natural minor/
    );
    expect(() => materializeProgression(resolveKey('C Major'), 'minor-loop')).toThrow(
      /Progression "minor-loop" is natural minor, but C Major is major/
    );
    expect(() => getProgressionPresets('chromatic' as Mode)).toThrow(/Unsupported mode/);
  });
});

describe('getRelativeKey', () => {
  it('resolves relative major and minor keys with strict spelling', () => {
    expect(getRelativeKey(resolveKey('C Major'))).toMatchObject({
      relationship: 'relativeMinor',
      key: { id: 'A Minor' }
    });
    expect(getRelativeKey(resolveKey('A Minor'))).toMatchObject({
      relationship: 'relativeMajor',
      key: { id: 'C Major' }
    });
    expect(getRelativeKey(resolveKey('Cb Major'))).toMatchObject({
      relationship: 'relativeMinor',
      key: { id: 'Ab Minor' }
    });
    expect(getRelativeKey(resolveKey('A# Minor'))).toMatchObject({
      relationship: 'relativeMajor',
      key: { id: 'C# Major' }
    });
  });
});
