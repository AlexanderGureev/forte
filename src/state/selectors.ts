import { buildDiatonicTriads } from '../music/chords';
import { buildScaleFingering, buildScaleFingeringSet } from '../music/fingerings';
import { RECOMMENDED_KEYS, resolveKey } from '../music/keys';
import { PHYSICAL_PITCH_CLASSES, isBlackKeyPitchClass } from '../music/note-spelling';
import { getRelativeKey, materializeProgression } from '../music/progressions';
import { buildScale } from '../music/scales';
import {
  createKeyboardViewModel,
  createScoreStaffViewModel,
  createTheoryOverlayModel,
  formatScaleDegreeLabel
} from '../music/view-models';
import type { AppState } from './app-state';
import type {
  ActiveChordSource,
  ColorLegendItem,
  DegreeLabel,
  DiatonicChord,
  KeyboardViewModel,
  KeyboardViewport,
  KeyDefinition,
  KeySignature,
  MaterializedProgression,
  NoteName,
  PhysicalPitchClass,
  ProgressionId,
  Scale,
  ScaleDegree,
  ScaleFingering,
  ScaleNote,
  ScoreStaffViewModel,
  TheoryOverlayModel
} from '../music/types';

export interface ScaleSummary {
  readonly key: KeyDefinition;
  readonly formula: Scale['formula'];
  readonly notes: readonly ScaleNote[];
  readonly noteNames: readonly NoteName[];
  readonly degreeLabels: readonly DegreeLabel[];
  readonly keySignature: KeySignature;
  readonly relativeKey: ReturnType<typeof getRelativeKey>;
  readonly scaleFingering: ScaleFingering | null;
}

export interface ChordCardViewModel {
  readonly degree: ScaleDegree;
  readonly romanDegree: string;
  readonly chordName: string;
  readonly quality: DiatonicChord['quality'];
  readonly notes: readonly ScaleNote[];
  readonly tense: boolean;
  readonly selected: boolean;
  readonly inCurrentProgression: boolean;
}

export interface ActiveChordStatus {
  readonly source: ActiveChordSource;
  readonly progressionId: ProgressionId;
  readonly stepIndex: number | null;
  readonly degree: ScaleDegree;
  readonly romanDegree: string;
  readonly chordName: string;
  readonly chord: DiatonicChord;
}

export interface MiniKeyboardKeyViewModel {
  readonly id: string;
  readonly physicalPitchClass: PhysicalPitchClass;
  readonly isWhiteKey: boolean;
  readonly isBlackKey: boolean;
  readonly noteLabel: NoteName | null;
  readonly active: boolean;
}

export interface ProgressionCardViewModel {
  readonly id: string;
  readonly progressionId: ProgressionId;
  readonly stepIndex: number;
  readonly degree: ScaleDegree;
  readonly romanDegree: string;
  readonly chordName: string;
  readonly notes: readonly ScaleNote[];
  readonly active: boolean;
  readonly miniKeyboardKeys: readonly MiniKeyboardKeyViewModel[];
}

export interface RecommendedKeyViewModel {
  readonly key: KeyDefinition;
  readonly selected: boolean;
  readonly sameMode: boolean;
}

const COLOR_LEGEND_ITEMS = [
  {
    id: 'inScale',
    label: 'Ноты гаммы',
    description: 'клавиши выбранной гаммы во всех видимых октавах'
  },
  {
    id: 'tonic',
    label: 'Тоника',
    description: 'главная нота выбранной тональности'
  },
  {
    id: 'activeChord',
    label: 'Активный аккорд',
    description: 'ноты текущего аккорда поверх слоя гаммы'
  },
  {
    id: 'chordRoot',
    label: 'Начало аккорда',
    description: 'белое кольцо — нота, с которой начинать активный аккорд'
  },
  {
    id: 'diminished',
    label: 'Уменьшенный (dim)',
    description: 'напряженный diminished-аккорд'
  }
] as const satisfies readonly ColorLegendItem[];

/** Показываются только при включенной аппликатуре гаммы. */
const FINGERING_LEGEND_ITEMS = [
  {
    id: 'fingering',
    label: 'Палец гаммы',
    description: 'золотой бейдж с номером пальца на ноте гаммы'
  },
  {
    id: 'fingeringOnChord',
    label: 'Палец на ноте аккорда',
    description: 'темный бейдж — номер пальца на подсвеченной ноте аккорда'
  }
] as const satisfies readonly ColorLegendItem[];

export function selectCurrentKey(state: AppState): KeyDefinition {
  return resolveKey(state.keySelection);
}

export function selectScaleSummary(state: AppState): ScaleSummary {
  const key = selectCurrentKey(state);
  const scale = buildScale(key);

  return {
    key,
    formula: scale.formula,
    notes: scale.notes,
    noteNames: scale.notes.map((note) => note.name),
    degreeLabels: scale.notes.map((note) => formatScaleDegreeLabel(key.mode, note.degree)),
    keySignature: key.keySignature,
    relativeKey: getRelativeKey(key),
    scaleFingering: selectScaleFingeringForScale(state, key, scale)
  };
}

export function selectChordList(state: AppState): readonly ChordCardViewModel[] {
  const key = selectCurrentKey(state);
  const chords = buildDiatonicTriads(key);
  const progression = selectCurrentProgression(state);
  const progressionDegrees = new Set(progression.steps.map((step) => step.degree));
  const activeChordStatus = selectActiveChordStatus(state);

  return chords.map((chord) => ({
    degree: chord.degree,
    romanDegree: chord.romanDegree,
    chordName: chord.name,
    quality: chord.quality,
    notes: chord.notes,
    tense: chord.tense,
    selected: chord.degree === activeChordStatus.degree,
    inCurrentProgression: progressionDegrees.has(chord.degree)
  }));
}

export function selectActiveChordStatus(state: AppState): ActiveChordStatus {
  const progression = selectCurrentProgression(state);
  const selectedDegree = state.selectedChordDegree;

  if (selectedDegree !== null) {
    const matchingStep = progression.steps.find((step) => step.degree === selectedDegree);

    if (matchingStep !== undefined) {
      return toProgressionChordStatus(progression, matchingStep.stepIndex);
    }

    const chord = buildDiatonicTriads(progression.key)[selectedDegree - 1];

    return {
      source: 'manual',
      progressionId: progression.id,
      stepIndex: null,
      degree: chord.degree,
      romanDegree: chord.romanDegree,
      chordName: chord.name,
      chord
    };
  }

  return toProgressionChordStatus(
    progression,
    clampProgressionStepIndex(state.activeProgressionStepIndex, progression)
  );
}

export function selectActiveProgressionCards(state: AppState): readonly ProgressionCardViewModel[] {
  const progression = selectCurrentProgression(state);
  const activeChordStatus = selectActiveChordStatus(state);

  return progression.steps.map((step) => ({
    id: `${progression.id}-${step.stepIndex}`,
    progressionId: progression.id,
    stepIndex: step.stepIndex,
    degree: step.degree,
    romanDegree: step.romanDegree,
    chordName: step.chordName,
    notes: step.notes,
    active:
      activeChordStatus.source === 'progression' &&
      activeChordStatus.stepIndex === step.stepIndex,
    miniKeyboardKeys: createMiniKeyboardKeys(step.notes)
  }));
}

export function selectRecommendedKeys(state: AppState): readonly RecommendedKeyViewModel[] {
  const currentKey = selectCurrentKey(state);

  return RECOMMENDED_KEYS.map((keyId) => {
    const key = resolveKey(keyId);

    return {
      key,
      selected: key.id === currentKey.id,
      sameMode: key.mode === currentKey.mode
    };
  });
}

export function selectColorLegend(state: AppState): readonly ColorLegendItem[] {
  if (!state.scaleFingeringEnabled) {
    return COLOR_LEGEND_ITEMS;
  }

  return [...COLOR_LEGEND_ITEMS, ...FINGERING_LEGEND_ITEMS];
}

export function selectKeyboardViewModel(
  state: AppState,
  viewport: KeyboardViewport
): KeyboardViewModel {
  const key = selectCurrentKey(state);
  const scale = buildScale(key);
  const activeChordStatus = selectActiveChordStatus(state);

  return createKeyboardViewModel({
    key,
    scale,
    activeChord: activeChordStatus.chord,
    chordLayerEnabled: state.chordLayerEnabled,
    scaleFingering: selectScaleFingeringForScale(state, key, scale),
    labelMode: state.labelMode,
    labelsVisible: state.labelsVisible,
    viewport
  });
}

export function selectScoreStaffViewModel(
  state: AppState,
  viewport: KeyboardViewport
): ScoreStaffViewModel | null {
  if (state.scaleDisplayMode === 'strip') {
    return null;
  }

  const key = selectCurrentKey(state);
  const scale = buildScale(key);
  const activeChordStatus = selectActiveChordStatus(state);

  return createScoreStaffViewModel({
    mode: state.scaleDisplayMode,
    key,
    scale,
    keyboard: selectKeyboardViewModel(state, viewport),
    activeChord: activeChordStatus.chord,
    chordLayerEnabled: state.chordLayerEnabled,
    scaleFingeringEnabled: state.scaleFingeringEnabled
  });
}

export function selectTheoryOverlayModel(state: AppState): TheoryOverlayModel {
  const key = selectCurrentKey(state);
  const scale = buildScale(key);
  const activeChordStatus = selectActiveChordStatus(state);

  return createTheoryOverlayModel({
    isOpen: state.theoryOverlay.isOpen,
    contextTarget: state.theoryOverlay.contextTarget,
    key,
    scale,
    chords: buildDiatonicTriads(key),
    activeChord: activeChordStatus.chord,
    activeChordSource: activeChordStatus.source,
    activeProgressionStepIndex: activeChordStatus.stepIndex,
    progression: selectCurrentProgression(state),
    colorLegend: selectColorLegend(state),
    scaleFingerings: buildScaleFingeringSet({ key, scale })
  });
}

export function selectCurrentProgression(state: AppState): MaterializedProgression {
  return materializeProgression(selectCurrentKey(state), state.selectedProgressionId);
}

function toProgressionChordStatus(
  progression: MaterializedProgression,
  stepIndex: number
): ActiveChordStatus {
  const step = progression.steps[stepIndex];

  return {
    source: 'progression',
    progressionId: progression.id,
    stepIndex: step.stepIndex,
    degree: step.degree,
    romanDegree: step.romanDegree,
    chordName: step.chordName,
    chord: step.chord
  };
}

function selectScaleFingeringForScale(
  state: AppState,
  key: KeyDefinition,
  scale: Scale
): ScaleFingering | null {
  if (!state.scaleFingeringEnabled) {
    return null;
  }

  return buildScaleFingering({
    key,
    scale,
    hand: state.scaleFingeringHand,
    direction: state.scaleFingeringDirection
  });
}

function clampProgressionStepIndex(
  stepIndex: number,
  progression: MaterializedProgression
): number {
  if (!Number.isInteger(stepIndex)) {
    return 0;
  }

  return Math.min(Math.max(stepIndex, 0), progression.steps.length - 1);
}

function createMiniKeyboardKeys(
  chordNotes: readonly ScaleNote[]
): readonly MiniKeyboardKeyViewModel[] {
  const chordNoteByPitchClass = new Map(chordNotes.map((note) => [note.physicalPitchClass, note]));

  return PHYSICAL_PITCH_CLASSES.map((physicalPitchClass) => {
    const note = chordNoteByPitchClass.get(physicalPitchClass) ?? null;
    const isBlackKey = isBlackKeyPitchClass(physicalPitchClass);

    return {
      id: `mini-${physicalPitchClass}`,
      physicalPitchClass,
      isWhiteKey: !isBlackKey,
      isBlackKey,
      noteLabel: note?.name ?? null,
      active: note !== null
    };
  });
}
