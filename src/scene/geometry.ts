import type { KeyboardKeyViewModel, KeyboardViewModel, PhysicalPitchClass } from '../music/types';

export const WHITE_KEY_PITCH = 1;
export const WHITE_KEY_WIDTH = 0.94;
export const WHITE_KEY_LENGTH = 5.6;
export const WHITE_KEY_HEIGHT = 0.5;

export const BLACK_KEY_WIDTH = 0.56;
export const BLACK_KEY_LENGTH = 3.4;
export const BLACK_KEY_HEIGHT = 0.5;
export const BLACK_KEY_TOP_RAISE = 0.32;
export const BLACK_KEY_CENTER_Z = -1.1;

export const WHITE_KEYS_PER_OCTAVE = 7;

const WHITE_INDEX_BY_PITCH_CLASS: ReadonlyMap<PhysicalPitchClass, number> = new Map([
  [0, 0],
  [2, 1],
  [4, 2],
  [5, 3],
  [7, 4],
  [9, 5],
  [11, 6]
]);

/**
 * Смещения черных клавиш внутри октавы повторяют реальную клавиатуру:
 * C#/F# сдвинуты к левой белой клавише, D#/A# — к правой, G# по центру.
 */
const BLACK_OFFSET_BY_PITCH_CLASS: ReadonlyMap<PhysicalPitchClass, number> = new Map([
  [1, 0.46],
  [3, 1.54],
  [6, 3.46],
  [8, 4.5],
  [10, 5.54]
]);

export interface KeyPlacement {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function getKeyboardWidth(octaveCount: number): number {
  return octaveCount * WHITE_KEYS_PER_OCTAVE * WHITE_KEY_PITCH;
}

export function getKeyPlacement(
  key: KeyboardKeyViewModel,
  viewModel: KeyboardViewModel
): KeyPlacement {
  const octaveIndex = key.octave - viewModel.startOctave;
  const octaveStart = octaveIndex * WHITE_KEYS_PER_OCTAVE;
  const totalWidth = getKeyboardWidth(viewModel.octaveCount);
  const centerShift = (totalWidth - WHITE_KEY_PITCH) / 2;

  if (key.isWhiteKey) {
    const whiteIndex = WHITE_INDEX_BY_PITCH_CLASS.get(key.physicalPitchClass);

    if (whiteIndex === undefined) {
      throw new Error(`Pitch class ${key.physicalPitchClass} is not a white key.`);
    }

    return {
      x: octaveStart + whiteIndex - centerShift,
      y: WHITE_KEY_HEIGHT / 2,
      z: 0
    };
  }

  const blackOffset = BLACK_OFFSET_BY_PITCH_CLASS.get(key.physicalPitchClass);

  if (blackOffset === undefined) {
    throw new Error(`Pitch class ${key.physicalPitchClass} is not a black key.`);
  }

  return {
    x: octaveStart + blackOffset - centerShift,
    y: WHITE_KEY_HEIGHT + BLACK_KEY_TOP_RAISE - BLACK_KEY_HEIGHT / 2,
    z: BLACK_KEY_CENTER_Z
  };
}
