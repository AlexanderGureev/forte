import type { Accidental, NoteLetter, NoteName, NoteSpelling, PhysicalPitchClass } from './types';

export const NOTE_NAMES = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'E#',
  'Fb',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
  'B#',
  'Cb'
] as const satisfies readonly NoteName[];

export const PHYSICAL_PITCH_CLASSES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const satisfies readonly PhysicalPitchClass[];

const BLACK_KEY_PITCH_CLASSES: ReadonlySet<PhysicalPitchClass> = new Set([1, 3, 6, 8, 10]);

const NOTE_NAME_SET: ReadonlySet<string> = new Set(NOTE_NAMES);

const NOTE_SPELLING_BY_NAME = {
  C: { name: 'C', letter: 'C', accidental: 'natural', physicalPitchClass: 0 },
  'C#': { name: 'C#', letter: 'C', accidental: 'sharp', physicalPitchClass: 1 },
  Db: { name: 'Db', letter: 'D', accidental: 'flat', physicalPitchClass: 1 },
  D: { name: 'D', letter: 'D', accidental: 'natural', physicalPitchClass: 2 },
  'D#': { name: 'D#', letter: 'D', accidental: 'sharp', physicalPitchClass: 3 },
  Eb: { name: 'Eb', letter: 'E', accidental: 'flat', physicalPitchClass: 3 },
  E: { name: 'E', letter: 'E', accidental: 'natural', physicalPitchClass: 4 },
  'E#': { name: 'E#', letter: 'E', accidental: 'sharp', physicalPitchClass: 5 },
  Fb: { name: 'Fb', letter: 'F', accidental: 'flat', physicalPitchClass: 4 },
  F: { name: 'F', letter: 'F', accidental: 'natural', physicalPitchClass: 5 },
  'F#': { name: 'F#', letter: 'F', accidental: 'sharp', physicalPitchClass: 6 },
  Gb: { name: 'Gb', letter: 'G', accidental: 'flat', physicalPitchClass: 6 },
  G: { name: 'G', letter: 'G', accidental: 'natural', physicalPitchClass: 7 },
  'G#': { name: 'G#', letter: 'G', accidental: 'sharp', physicalPitchClass: 8 },
  Ab: { name: 'Ab', letter: 'A', accidental: 'flat', physicalPitchClass: 8 },
  A: { name: 'A', letter: 'A', accidental: 'natural', physicalPitchClass: 9 },
  'A#': { name: 'A#', letter: 'A', accidental: 'sharp', physicalPitchClass: 10 },
  Bb: { name: 'Bb', letter: 'B', accidental: 'flat', physicalPitchClass: 10 },
  B: { name: 'B', letter: 'B', accidental: 'natural', physicalPitchClass: 11 },
  'B#': { name: 'B#', letter: 'B', accidental: 'sharp', physicalPitchClass: 0 },
  Cb: { name: 'Cb', letter: 'C', accidental: 'flat', physicalPitchClass: 11 }
} as const satisfies Record<
  NoteName,
  {
    readonly name: NoteName;
    readonly letter: NoteLetter;
    readonly accidental: Accidental;
    readonly physicalPitchClass: PhysicalPitchClass;
  }
>;

export const NOTE_NAMES_BY_PITCH_CLASS = {
  0: ['C', 'B#'],
  1: ['C#', 'Db'],
  2: ['D'],
  3: ['D#', 'Eb'],
  4: ['E', 'Fb'],
  5: ['F', 'E#'],
  6: ['F#', 'Gb'],
  7: ['G'],
  8: ['G#', 'Ab'],
  9: ['A'],
  10: ['A#', 'Bb'],
  11: ['B', 'Cb']
} as const satisfies Record<PhysicalPitchClass, readonly NoteName[]>;

export function isNoteName(value: string): value is NoteName {
  return NOTE_NAME_SET.has(value);
}

export function hasDoubleAccidental(value: string): boolean {
  return value.includes('##') || value.includes('bb') || value.includes('x');
}

export function isPhysicalPitchClass(value: number): value is PhysicalPitchClass {
  return Number.isInteger(value) && value >= 0 && value <= 11;
}

export function isBlackKeyPitchClass(pitchClass: PhysicalPitchClass): boolean {
  return BLACK_KEY_PITCH_CLASSES.has(pitchClass);
}

export function getNoteSpelling(noteName: NoteName): NoteSpelling {
  return NOTE_SPELLING_BY_NAME[noteName];
}

export function getPhysicalPitchClass(noteName: NoteName): PhysicalPitchClass {
  return getNoteSpelling(noteName).physicalPitchClass;
}

export function getEnharmonicNoteNamesForPitchClass(
  pitchClass: PhysicalPitchClass
): readonly NoteName[] {
  return NOTE_NAMES_BY_PITCH_CLASS[pitchClass];
}
