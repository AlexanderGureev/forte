import { SUPPORTED_MAJOR_KEYS, SUPPORTED_NATURAL_MINOR_KEYS } from './keys';
import type {
  KeyDefinition,
  Scale,
  ScaleFingering,
  ScaleFingeringDirection,
  ScaleFingeringHand,
  ScaleFingeringOctaveOffset,
  ScaleFingeringPattern,
  ScaleFingeringStep,
  ScaleNote
} from './types';

export const SCALE_FINGERING_HANDS = ['right', 'left'] as const satisfies readonly ScaleFingeringHand[];
export const SCALE_FINGERING_DIRECTIONS = [
  'ascending',
  'descending'
] as const satisfies readonly ScaleFingeringDirection[];

type ScaleFingeringPatternSet = Record<ScaleFingeringHand, ScaleFingeringPattern>;

const MAJOR_SCALE_FINGERINGS = {
  C: {
    right: [1, 2, 3, 1, 2, 3, 4, 5],
    left: [5, 4, 3, 2, 1, 3, 2, 1]
  },
  G: {
    right: [1, 2, 3, 1, 2, 3, 4, 5],
    left: [5, 4, 3, 2, 1, 3, 2, 1]
  },
  D: {
    right: [1, 2, 3, 1, 2, 3, 4, 5],
    left: [5, 4, 3, 2, 1, 3, 2, 1]
  },
  A: {
    right: [1, 2, 3, 1, 2, 3, 4, 5],
    left: [5, 4, 3, 2, 1, 3, 2, 1]
  },
  E: {
    right: [1, 2, 3, 1, 2, 3, 4, 5],
    left: [5, 4, 3, 2, 1, 3, 2, 1]
  },
  B: {
    right: [1, 2, 3, 1, 2, 3, 4, 5],
    left: [4, 3, 2, 1, 4, 3, 2, 1]
  },
  'F#': {
    right: [2, 3, 4, 1, 2, 3, 1, 2],
    left: [4, 3, 2, 1, 3, 2, 1, 4]
  },
  'C#': {
    right: [2, 3, 1, 2, 3, 4, 1, 2],
    left: [3, 2, 1, 4, 3, 2, 1, 3]
  },
  F: {
    right: [1, 2, 3, 4, 1, 2, 3, 4],
    left: [5, 4, 3, 2, 1, 3, 2, 1]
  },
  Bb: {
    right: [2, 1, 2, 3, 1, 2, 3, 4],
    left: [3, 2, 1, 4, 3, 2, 1, 3]
  },
  Eb: {
    right: [3, 1, 2, 3, 4, 1, 2, 3],
    left: [3, 2, 1, 4, 3, 2, 1, 3]
  },
  Ab: {
    right: [3, 4, 1, 2, 3, 1, 2, 3],
    left: [3, 2, 1, 4, 3, 2, 1, 3]
  },
  Db: {
    right: [2, 3, 1, 2, 3, 4, 1, 2],
    left: [3, 2, 1, 4, 3, 2, 1, 3]
  },
  Gb: {
    right: [2, 3, 4, 1, 2, 3, 1, 2],
    left: [4, 3, 2, 1, 3, 2, 1, 4]
  },
  Cb: {
    right: [1, 2, 3, 1, 2, 3, 4, 5],
    left: [4, 3, 2, 1, 4, 3, 2, 1]
  }
} as const satisfies Record<(typeof SUPPORTED_MAJOR_KEYS)[number], ScaleFingeringPatternSet>;

const NATURAL_MINOR_SCALE_FINGERINGS = {
  A: {
    right: [1, 2, 3, 1, 2, 3, 4, 5],
    left: [5, 4, 3, 2, 1, 3, 2, 1]
  },
  E: {
    right: [1, 2, 3, 1, 2, 3, 4, 5],
    left: [5, 4, 3, 2, 1, 3, 2, 1]
  },
  B: {
    right: [1, 2, 3, 1, 2, 3, 4, 5],
    left: [4, 3, 2, 1, 4, 3, 2, 1]
  },
  'F#': {
    right: [2, 3, 1, 2, 3, 1, 2, 3],
    left: [4, 3, 2, 1, 3, 2, 1, 4]
  },
  'C#': {
    right: [3, 4, 1, 2, 3, 1, 2, 3],
    left: [3, 2, 1, 4, 3, 2, 1, 3]
  },
  'G#': {
    right: [3, 4, 1, 2, 3, 1, 2, 3],
    left: [3, 2, 1, 3, 2, 1, 4, 3]
  },
  'D#': {
    right: [3, 1, 2, 3, 4, 1, 2, 3],
    left: [2, 1, 4, 3, 2, 1, 3, 2]
  },
  'A#': {
    right: [2, 1, 2, 3, 1, 2, 3, 4],
    left: [2, 1, 3, 2, 1, 4, 3, 2]
  },
  D: {
    right: [1, 2, 3, 1, 2, 3, 4, 5],
    left: [5, 4, 3, 2, 1, 3, 2, 1]
  },
  G: {
    right: [1, 2, 3, 1, 2, 3, 4, 5],
    left: [5, 4, 3, 2, 1, 3, 2, 1]
  },
  C: {
    right: [1, 2, 3, 1, 2, 3, 4, 5],
    left: [5, 4, 3, 2, 1, 3, 2, 1]
  },
  F: {
    right: [1, 2, 3, 4, 1, 2, 3, 4],
    left: [5, 4, 3, 2, 1, 3, 2, 1]
  },
  Bb: {
    right: [2, 1, 2, 3, 1, 2, 3, 4],
    left: [2, 1, 3, 2, 1, 4, 3, 2]
  },
  Eb: {
    right: [3, 1, 2, 3, 4, 1, 2, 3],
    left: [2, 1, 4, 3, 2, 1, 3, 2]
  },
  Ab: {
    right: [3, 4, 1, 2, 3, 1, 2, 3],
    left: [3, 2, 1, 3, 2, 1, 4, 3]
  }
} as const satisfies Record<
  (typeof SUPPORTED_NATURAL_MINOR_KEYS)[number],
  ScaleFingeringPatternSet
>;

export function buildScaleFingering(input: {
  readonly key: KeyDefinition;
  readonly scale: Scale;
  readonly hand: ScaleFingeringHand;
  readonly direction: ScaleFingeringDirection;
}): ScaleFingering {
  const ascendingPattern = getAscendingPatternSet(input.key)[input.hand];
  const pattern =
    input.direction === 'ascending' ? ascendingPattern : reverseFingeringPattern(ascendingPattern);

  return {
    key: input.key,
    hand: input.hand,
    direction: input.direction,
    steps: createFingeringSteps({
      key: input.key,
      scale: input.scale,
      pattern,
      direction: input.direction
    }),
    patternLabel: pattern.join('-')
  };
}

export function buildScaleFingeringSet(input: {
  readonly key: KeyDefinition;
  readonly scale: Scale;
}): readonly ScaleFingering[] {
  return SCALE_FINGERING_HANDS.flatMap((hand) =>
    SCALE_FINGERING_DIRECTIONS.map((direction) =>
      buildScaleFingering({
        key: input.key,
        scale: input.scale,
        hand,
        direction
      })
    )
  );
}

function getAscendingPatternSet(key: KeyDefinition): ScaleFingeringPatternSet {
  const fingering =
    key.mode === 'major'
      ? MAJOR_SCALE_FINGERINGS[key.tonic as (typeof SUPPORTED_MAJOR_KEYS)[number]]
      : NATURAL_MINOR_SCALE_FINGERINGS[
          key.tonic as (typeof SUPPORTED_NATURAL_MINOR_KEYS)[number]
        ];

  if (fingering === undefined) {
    throw new Error(`No scale fingering is defined for ${key.displayName}.`);
  }

  return fingering;
}

function createFingeringSteps(input: {
  readonly key: KeyDefinition;
  readonly scale: Scale;
  readonly pattern: ScaleFingeringPattern;
  readonly direction: ScaleFingeringDirection;
}): readonly ScaleFingeringStep[] {
  const scaleNotes =
    input.direction === 'ascending'
      ? [...input.scale.notes, input.scale.notes[0]]
      : [input.scale.notes[0], ...input.scale.notes.slice(1).reverse(), input.scale.notes[0]];

  return scaleNotes.map((scaleNote, index) => ({
    stepIndex: index,
    scaleNote,
    finger: input.pattern[index],
    octaveOffset: getScaleFingeringOctaveOffset({
      key: input.key,
      scaleNote,
      stepIndex: index,
      direction: input.direction
    })
  }));
}

function getScaleFingeringOctaveOffset(input: {
  readonly key: KeyDefinition;
  readonly scaleNote: ScaleNote;
  readonly stepIndex: number;
  readonly direction: ScaleFingeringDirection;
}): ScaleFingeringOctaveOffset {
  if (input.direction === 'ascending' && input.stepIndex === 7) {
    return 1;
  }

  if (input.direction === 'descending' && input.stepIndex === 0) {
    return 1;
  }

  if (input.direction === 'descending' && input.stepIndex === 7) {
    return 0;
  }

  return input.scaleNote.physicalPitchClass < input.key.physicalPitchClass ? 1 : 0;
}

function reverseFingeringPattern(pattern: ScaleFingeringPattern): ScaleFingeringPattern {
  const reversed = [...pattern].reverse();

  if (reversed.length !== pattern.length) {
    throw new Error('Cannot reverse an incomplete scale fingering pattern.');
  }

  return reversed as unknown as ScaleFingeringPattern;
}
