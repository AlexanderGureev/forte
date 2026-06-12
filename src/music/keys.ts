import {
  getEnharmonicNoteNamesForPitchClass,
  getPhysicalPitchClass,
  hasDoubleAccidental,
  isNoteName,
  isPhysicalPitchClass
} from './note-spelling';
import type {
  Difficulty,
  KeyDefinition,
  KeyId,
  KeySelection,
  KeySignature,
  KeySignatureAccidental,
  Mode,
  NoteLetter,
  NoteName,
  PhysicalPitchClass
} from './types';

export const SUPPORTED_MAJOR_KEYS = [
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
] as const satisfies readonly NoteName[];

export const SUPPORTED_NATURAL_MINOR_KEYS = [
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
] as const satisfies readonly NoteName[];

export const RECOMMENDED_KEYS = [
  'C Major',
  'G Major',
  'D Major',
  'F Major',
  'A Minor',
  'E Minor',
  'D Minor'
] as const satisfies readonly KeyId[];

type SupportedMajorKey = (typeof SUPPORTED_MAJOR_KEYS)[number];
type SupportedNaturalMinorKey = (typeof SUPPORTED_NATURAL_MINOR_KEYS)[number];

interface SignatureBasis {
  readonly accidental: KeySignatureAccidental;
  readonly count: number;
}

const SHARP_SIGNATURE_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'] as const satisfies readonly NoteLetter[];
const FLAT_SIGNATURE_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'] as const satisfies readonly NoteLetter[];

const MAJOR_SIGNATURES = {
  C: { accidental: 'natural', count: 0 },
  G: { accidental: 'sharp', count: 1 },
  D: { accidental: 'sharp', count: 2 },
  A: { accidental: 'sharp', count: 3 },
  E: { accidental: 'sharp', count: 4 },
  B: { accidental: 'sharp', count: 5 },
  'F#': { accidental: 'sharp', count: 6 },
  'C#': { accidental: 'sharp', count: 7 },
  F: { accidental: 'flat', count: 1 },
  Bb: { accidental: 'flat', count: 2 },
  Eb: { accidental: 'flat', count: 3 },
  Ab: { accidental: 'flat', count: 4 },
  Db: { accidental: 'flat', count: 5 },
  Gb: { accidental: 'flat', count: 6 },
  Cb: { accidental: 'flat', count: 7 }
} as const satisfies Record<SupportedMajorKey, SignatureBasis>;

const NATURAL_MINOR_SIGNATURES = {
  A: { accidental: 'natural', count: 0 },
  E: { accidental: 'sharp', count: 1 },
  B: { accidental: 'sharp', count: 2 },
  'F#': { accidental: 'sharp', count: 3 },
  'C#': { accidental: 'sharp', count: 4 },
  'G#': { accidental: 'sharp', count: 5 },
  'D#': { accidental: 'sharp', count: 6 },
  'A#': { accidental: 'sharp', count: 7 },
  D: { accidental: 'flat', count: 1 },
  G: { accidental: 'flat', count: 2 },
  C: { accidental: 'flat', count: 3 },
  F: { accidental: 'flat', count: 4 },
  Bb: { accidental: 'flat', count: 5 },
  Eb: { accidental: 'flat', count: 6 },
  Ab: { accidental: 'flat', count: 7 }
} as const satisfies Record<SupportedNaturalMinorKey, SignatureBasis>;

const RECOMMENDED_KEY_SET: ReadonlySet<string> = new Set(RECOMMENDED_KEYS);

function getDifficulty(signsCount: number): Difficulty {
  if (signsCount <= 1) {
    return 'easy';
  }

  if (signsCount <= 3) {
    return 'medium';
  }

  return 'advanced';
}

function buildKeySignature(signature: SignatureBasis): KeySignature {
  const notes =
    signature.accidental === 'sharp'
      ? SHARP_SIGNATURE_ORDER.slice(0, signature.count)
      : signature.accidental === 'flat'
        ? FLAT_SIGNATURE_ORDER.slice(0, signature.count)
        : [];

  return {
    accidental: signature.accidental,
    count: signature.count,
    notes
  };
}

function formatKeyId(tonic: NoteName, mode: Mode): KeyId {
  return `${tonic} ${mode === 'major' ? 'Major' : 'Minor'}`;
}

function buildKeyDefinition(tonic: NoteName, mode: Mode, signature: SignatureBasis): KeyDefinition {
  const id = formatKeyId(tonic, mode);
  const keySignature = buildKeySignature(signature);

  return {
    id,
    tonic,
    mode,
    physicalPitchClass: getPhysicalPitchClass(tonic),
    keySignature,
    signsCount: keySignature.count,
    difficulty: getDifficulty(keySignature.count),
    recommended: RECOMMENDED_KEY_SET.has(id),
    displayName: id
  };
}

const MAJOR_KEY_DEFINITIONS = SUPPORTED_MAJOR_KEYS.map((tonic) =>
  buildKeyDefinition(tonic, 'major', MAJOR_SIGNATURES[tonic])
);

const NATURAL_MINOR_KEY_DEFINITIONS = SUPPORTED_NATURAL_MINOR_KEYS.map((tonic) =>
  buildKeyDefinition(tonic, 'naturalMinor', NATURAL_MINOR_SIGNATURES[tonic])
);

const ALL_KEY_DEFINITIONS = [...MAJOR_KEY_DEFINITIONS, ...NATURAL_MINOR_KEY_DEFINITIONS] as const;

const KEY_DEFINITION_BY_ID: ReadonlyMap<string, KeyDefinition> = new Map(
  ALL_KEY_DEFINITIONS.map((key) => [key.id, key])
);

const SUPPORTED_MAJOR_KEY_SET: ReadonlySet<string> = new Set(SUPPORTED_MAJOR_KEYS);
const SUPPORTED_NATURAL_MINOR_KEY_SET: ReadonlySet<string> = new Set(SUPPORTED_NATURAL_MINOR_KEYS);

export function getSupportedKeys(mode?: Mode): readonly KeyDefinition[] {
  if (mode === undefined) {
    return ALL_KEY_DEFINITIONS;
  }

  assertSupportedMode(mode);

  return mode === 'major' ? MAJOR_KEY_DEFINITIONS : NATURAL_MINOR_KEY_DEFINITIONS;
}

export function resolveKey(input: KeySelection): KeyDefinition {
  const { tonic, mode, label } = normalizeKeySelection(input);
  const id = formatKeyId(tonic, mode);
  const key = KEY_DEFINITION_BY_ID.get(id);

  if (key === undefined) {
    const supportedKeys =
      mode === 'major' ? SUPPORTED_MAJOR_KEYS.join(', ') : SUPPORTED_NATURAL_MINOR_KEYS.join(', ');

    throw new Error(
      `Unsupported key "${label}". Supported ${getModeDisplayName(mode)} tonics: ${supportedKeys}.`
    );
  }

  return key;
}

export function getEnharmonicOptionsForPitchClass(
  pitchClass: PhysicalPitchClass,
  mode: Mode
): readonly KeyDefinition[] {
  if (!isPhysicalPitchClass(pitchClass)) {
    throw new Error(`Invalid pitch class "${pitchClass}". Expected an integer from 0 to 11.`);
  }

  assertSupportedMode(mode);

  const supportedTonicSet =
    mode === 'major' ? SUPPORTED_MAJOR_KEY_SET : SUPPORTED_NATURAL_MINOR_KEY_SET;

  return getEnharmonicNoteNamesForPitchClass(pitchClass)
    .filter((noteName) => supportedTonicSet.has(noteName))
    .map((tonic) => resolveKey({ tonic, mode }));
}

function normalizeKeySelection(input: KeySelection): {
  readonly tonic: NoteName;
  readonly mode: Mode;
  readonly label: string;
} {
  if (typeof input === 'string') {
    return parseKeyId(input);
  }

  if ('id' in input) {
    return parseKeyId(input.id);
  }

  const tonic = parseTonic(input.tonic);
  assertSupportedMode(input.mode);

  return {
    tonic,
    mode: input.mode,
    label: formatKeyId(tonic, input.mode)
  };
}

function parseKeyId(keyId: string): {
  readonly tonic: NoteName;
  readonly mode: Mode;
  readonly label: string;
} {
  const tonicCandidate = keyId.split(' ')[0];

  if (hasDoubleAccidental(tonicCandidate)) {
    throw new Error(`Unsupported tonic "${tonicCandidate}". Double accidentals are not supported.`);
  }

  const match = /^([A-G](?:#{1,2}|b{1,2})?) (Major|Minor|Natural Minor)$/.exec(keyId);

  if (match === null) {
    throw new Error(
      `Unsupported key selection "${keyId}". Expected "<tonic> Major" or "<tonic> Minor".`
    );
  }

  const tonic = parseTonic(match[1]);
  const mode = match[2] === 'Major' ? 'major' : 'naturalMinor';

  return {
    tonic,
    mode,
    label: formatKeyId(tonic, mode)
  };
}

function parseTonic(value: string): NoteName {
  if (hasDoubleAccidental(value)) {
    throw new Error(`Unsupported tonic "${value}". Double accidentals are not supported.`);
  }

  if (!isNoteName(value)) {
    throw new Error(`Unsupported tonic "${value}". Expected a supported single-accidental note name.`);
  }

  return value;
}

function assertSupportedMode(mode: Mode): asserts mode is Mode {
  if (mode !== 'major' && mode !== 'naturalMinor') {
    throw new Error(`Unsupported mode "${mode}". Expected "major" or "naturalMinor".`);
  }
}

function getModeDisplayName(mode: Mode): string {
  return mode === 'major' ? 'major' : 'natural minor';
}
