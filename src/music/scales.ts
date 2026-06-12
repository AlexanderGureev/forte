import { getNoteSpelling, isNoteName } from './note-spelling';
import type {
  KeyDefinition,
  Mode,
  NoteLetter,
  NoteName,
  PhysicalPitchClass,
  Scale,
  ScaleDegree,
  ScaleFormulaStep,
  ScaleNote
} from './types';

export const SCALE_FORMULAS = {
  major: ['W', 'W', 'H', 'W', 'W', 'W', 'H'],
  naturalMinor: ['W', 'H', 'W', 'W', 'H', 'W', 'W']
} as const satisfies Record<Mode, readonly ScaleFormulaStep[]>;

const SCALE_INTERVALS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10]
} as const satisfies Record<Mode, readonly PhysicalPitchClass[]>;

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const satisfies readonly NoteLetter[];

const NATURAL_PITCH_CLASS_BY_LETTER = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11
} as const satisfies Record<NoteLetter, PhysicalPitchClass>;

export function buildScale(key: KeyDefinition): Scale {
  const letters = getScaleLetters(key.tonic);
  const intervals = SCALE_INTERVALS[key.mode];

  return {
    key,
    formula: SCALE_FORMULAS[key.mode],
    notes: intervals.map((interval, index) => {
      const degree = (index + 1) as ScaleDegree;
      const physicalPitchClass = addPitchClasses(key.physicalPitchClass, interval);
      const name = spellNoteName(letters[index], physicalPitchClass, key, degree);
      const spelling = getNoteSpelling(name);

      return {
        ...spelling,
        degree
      } satisfies ScaleNote;
    })
  };
}

function getScaleLetters(tonic: NoteName): readonly NoteLetter[] {
  const tonicLetter = getNoteSpelling(tonic).letter;
  const tonicIndex = LETTERS.indexOf(tonicLetter);

  return LETTERS.map((_, index) => LETTERS[(tonicIndex + index) % LETTERS.length]);
}

function spellNoteName(
  letter: NoteLetter,
  physicalPitchClass: PhysicalPitchClass,
  key: KeyDefinition,
  degree: ScaleDegree
): NoteName {
  const naturalPitchClass = NATURAL_PITCH_CLASS_BY_LETTER[letter];
  const accidentalOffset = (physicalPitchClass - naturalPitchClass + 12) % 12;
  const candidate =
    accidentalOffset === 0
      ? letter
      : accidentalOffset === 1
        ? `${letter}#`
        : accidentalOffset === 11
          ? `${letter}b`
          : null;

  if (candidate === null || !isNoteName(candidate)) {
    throw new Error(
      `Cannot spell degree ${degree} of ${key.displayName} without double accidentals.`
    );
  }

  return candidate;
}

function addPitchClasses(
  physicalPitchClass: PhysicalPitchClass,
  interval: PhysicalPitchClass
): PhysicalPitchClass {
  return ((physicalPitchClass + interval) % 12) as PhysicalPitchClass;
}
