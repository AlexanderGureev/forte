import { buildScale } from './scales';
import type {
  ChordFormula,
  ChordQuality,
  DiatonicChord,
  KeyDefinition,
  Mode,
  NoteName,
  ScaleDegree,
  ScaleNote
} from './types';

export const CHORD_FORMULAS = {
  major: {
    quality: 'major',
    labels: ['1', '3', '5'],
    semitones: [0, 4, 7]
  },
  minor: {
    quality: 'minor',
    labels: ['1', 'b3', '5'],
    semitones: [0, 3, 7]
  },
  diminished: {
    quality: 'diminished',
    labels: ['1', 'b3', 'b5'],
    semitones: [0, 3, 6]
  }
} as const satisfies Record<ChordQuality, ChordFormula>;

const DIATONIC_TRIAD_PATTERNS = {
  major: [
    { romanDegree: 'I', quality: 'major' },
    { romanDegree: 'ii', quality: 'minor' },
    { romanDegree: 'iii', quality: 'minor' },
    { romanDegree: 'IV', quality: 'major' },
    { romanDegree: 'V', quality: 'major' },
    { romanDegree: 'vi', quality: 'minor' },
    { romanDegree: 'vii°', quality: 'diminished' }
  ],
  naturalMinor: [
    { romanDegree: 'i', quality: 'minor' },
    { romanDegree: 'ii°', quality: 'diminished' },
    { romanDegree: 'III', quality: 'major' },
    { romanDegree: 'iv', quality: 'minor' },
    { romanDegree: 'v', quality: 'minor' },
    { romanDegree: 'VI', quality: 'major' },
    { romanDegree: 'VII', quality: 'major' }
  ]
} as const satisfies Record<
  Mode,
  readonly {
    readonly romanDegree: string;
    readonly quality: ChordQuality;
  }[]
>;

const SCALE_DEGREES = [1, 2, 3, 4, 5, 6, 7] as const satisfies readonly ScaleDegree[];

export function buildDiatonicTriads(key: KeyDefinition): readonly DiatonicChord[] {
  const scale = buildScale(key);
  const triadPattern = DIATONIC_TRIAD_PATTERNS[key.mode];

  return SCALE_DEGREES.map((degree, index) => {
    const root = scale.notes[index];
    const pattern = triadPattern[index];
    const notes = getTriadNotes(scale.notes, index);

    return {
      degree,
      romanDegree: pattern.romanDegree,
      name: formatChordName(root.name, pattern.quality),
      quality: pattern.quality,
      notes,
      formula: CHORD_FORMULAS[pattern.quality],
      tense: pattern.quality === 'diminished'
    } satisfies DiatonicChord;
  });
}

function getTriadNotes(notes: readonly ScaleNote[], rootIndex: number): readonly ScaleNote[] {
  return [0, 2, 4].map((offset) => notes[(rootIndex + offset) % notes.length]);
}

function formatChordName(root: NoteName, quality: ChordQuality): string {
  if (quality === 'major') {
    return root;
  }

  if (quality === 'minor') {
    return `${root}m`;
  }

  return `${root}dim`;
}
