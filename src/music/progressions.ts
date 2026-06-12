import { buildDiatonicTriads } from './chords';
import { resolveKey } from './keys';
import { buildScale } from './scales';
import type {
  KeyDefinition,
  MaterializedProgression,
  Mode,
  ProgressionId,
  ProgressionPreset,
  ProgressionStep,
  RelativeKey,
  ScaleDegree
} from './types';

const MAJOR_PROGRESSION_PRESETS = [
  {
    id: 'loop-1',
    mode: 'major',
    name: 'I-V-vi-IV',
    steps: createProgressionSteps([1, 5, 6, 4], ['I', 'V', 'vi', 'IV'])
  },
  {
    id: 'classic',
    mode: 'major',
    name: 'I-IV-V',
    steps: createProgressionSteps([1, 4, 5], ['I', 'IV', 'V'])
  },
  {
    id: 'cadence',
    mode: 'major',
    name: 'ii-V-I',
    steps: createProgressionSteps([2, 5, 1], ['ii', 'V', 'I'])
  }
] as const satisfies readonly ProgressionPreset[];

const NATURAL_MINOR_PROGRESSION_PRESETS = [
  {
    id: 'minor-loop',
    mode: 'naturalMinor',
    name: 'i-VI-III-VII',
    steps: createProgressionSteps([1, 6, 3, 7], ['i', 'VI', 'III', 'VII'])
  },
  {
    id: 'minor-basic',
    mode: 'naturalMinor',
    name: 'i-iv-v',
    steps: createProgressionSteps([1, 4, 5], ['i', 'iv', 'v'])
  },
  {
    id: 'descent',
    mode: 'naturalMinor',
    name: 'i-VII-VI-VII',
    steps: createProgressionSteps([1, 7, 6, 7], ['i', 'VII', 'VI', 'VII'])
  }
] as const satisfies readonly ProgressionPreset[];

const PROGRESSION_PRESETS = [
  ...MAJOR_PROGRESSION_PRESETS,
  ...NATURAL_MINOR_PROGRESSION_PRESETS
] as const satisfies readonly ProgressionPreset[];

const PROGRESSION_PRESET_BY_ID: ReadonlyMap<string, ProgressionPreset> = new Map(
  PROGRESSION_PRESETS.map((preset) => [preset.id, preset])
);

export function getProgressionPresets(mode: Mode): readonly ProgressionPreset[] {
  assertSupportedMode(mode);

  return mode === 'major' ? MAJOR_PROGRESSION_PRESETS : NATURAL_MINOR_PROGRESSION_PRESETS;
}

export function materializeProgression(
  key: KeyDefinition,
  progressionId: ProgressionId
): MaterializedProgression {
  const preset = PROGRESSION_PRESET_BY_ID.get(progressionId);

  if (preset === undefined) {
    throw new Error(
      `Unsupported progression id "${progressionId}". Supported progression ids: ${PROGRESSION_PRESETS.map(
        (progression) => progression.id
      ).join(', ')}.`
    );
  }

  if (preset.mode !== key.mode) {
    throw new Error(
      `Progression "${progressionId}" is ${getModeDisplayName(
        preset.mode
      )}, but ${key.displayName} is ${getModeDisplayName(key.mode)}.`
    );
  }

  const chords = buildDiatonicTriads(key);

  return {
    id: preset.id,
    mode: preset.mode,
    name: preset.name,
    key,
    steps: preset.steps.map((step) => {
      const chord = chords[step.degree - 1];

      return {
        ...step,
        chordName: chord.name,
        chord,
        notes: chord.notes
      };
    })
  };
}

export function getRelativeKey(key: KeyDefinition): RelativeKey {
  const scale = buildScale(key);

  if (key.mode === 'major') {
    return {
      relationship: 'relativeMinor',
      key: resolveKey({ tonic: scale.notes[5].name, mode: 'naturalMinor' })
    };
  }

  return {
    relationship: 'relativeMajor',
    key: resolveKey({ tonic: scale.notes[2].name, mode: 'major' })
  };
}

function createProgressionSteps(
  degrees: readonly ScaleDegree[],
  romanDegrees: readonly string[]
): readonly ProgressionStep[] {
  if (degrees.length !== romanDegrees.length) {
    throw new Error('Progression degrees and roman degrees must have the same length.');
  }

  return degrees.map((degree, stepIndex) => ({
    stepIndex,
    degree,
    romanDegree: romanDegrees[stepIndex]
  }));
}

function assertSupportedMode(mode: Mode): asserts mode is Mode {
  if (mode !== 'major' && mode !== 'naturalMinor') {
    throw new Error(`Unsupported mode "${mode}". Expected "major" or "naturalMinor".`);
  }
}

function getModeDisplayName(mode: Mode): string {
  return mode === 'major' ? 'major' : 'natural minor';
}
