import { create } from 'zustand';
import { getEnharmonicOptionsForPitchClass, getSupportedKeys, resolveKey } from '../music/keys';
import { getProgressionPresets } from '../music/progressions';
import type {
  KeyDefinition,
  KeySelection,
  LabelMode,
  Mode,
  ProgressionId,
  ProgressionPreset,
  ScaleDegree,
  TheoryOverlayContextTarget
} from '../music/types';

export interface TheoryOverlayState {
  readonly isOpen: boolean;
  readonly contextTarget: TheoryOverlayContextTarget | null;
}

export interface AppState {
  readonly keySelection: KeySelection;
  readonly mode: Mode;
  readonly selectedProgressionId: ProgressionId;
  readonly activeProgressionStepIndex: number;
  readonly selectedChordDegree: ScaleDegree | null;
  readonly chordLayerEnabled: boolean;
  readonly labelMode: LabelMode;
  readonly labelsVisible: boolean;
  readonly focusMode: boolean;
  readonly theoryOverlay: TheoryOverlayState;
}

export interface AppActions {
  readonly selectMode: (mode: Mode) => void;
  readonly selectKey: (keySelection: KeySelection) => void;
  readonly selectProgressionPreset: (progressionId: ProgressionId) => void;
  readonly selectActiveProgressionStep: (stepIndex: number) => void;
  readonly selectChordDegree: (degree: ScaleDegree) => void;
  readonly setChordLayerEnabled: (enabled: boolean) => void;
  readonly toggleChordLayer: () => void;
  readonly setLabelMode: (labelMode: LabelMode) => void;
  readonly setLabelsVisible: (visible: boolean) => void;
  readonly toggleLabelsVisible: () => void;
  readonly setFocusMode: (enabled: boolean) => void;
  readonly toggleFocusMode: () => void;
  readonly openTheoryOverlay: (contextTarget: TheoryOverlayContextTarget) => void;
  readonly closeTheoryOverlay: () => void;
}

export type AppStore = AppState & AppActions;

const DEFAULT_KEY_SELECTION = 'C Major' satisfies KeySelection;

const SCALE_DEGREES = [1, 2, 3, 4, 5, 6, 7] as const satisfies readonly ScaleDegree[];

const THEORY_OVERLAY_CONTEXT_TARGETS = [
  'key',
  'scale',
  'chords',
  'progression',
  'activeChord',
  'keyboard',
  'colorLegend'
] as const satisfies readonly TheoryOverlayContextTarget[];

export function createInitialAppState(): AppState {
  const key = resolveKey(DEFAULT_KEY_SELECTION);

  return {
    keySelection: key.id,
    mode: key.mode,
    selectedProgressionId: getDefaultProgressionId(key.mode),
    activeProgressionStepIndex: 0,
    selectedChordDegree: null,
    chordLayerEnabled: true,
    labelMode: 'notes',
    labelsVisible: true,
    focusMode: false,
    theoryOverlay: {
      isOpen: false,
      contextTarget: null
    }
  };
}

export const useAppStore = create<AppStore>()((set) => ({
  ...createInitialAppState(),

  selectMode: (mode) => {
    assertSupportedMode(mode);

    set((state) => {
      if (state.mode === mode) {
        return {};
      }

      const currentKey = resolveKey(state.keySelection);
      const nextKey = resolveCompatibleKeyForMode(currentKey, mode);

      return {
        keySelection: nextKey.id,
        mode,
        selectedProgressionId: getDefaultProgressionId(mode),
        activeProgressionStepIndex: 0,
        selectedChordDegree: null
      };
    });
  },

  selectKey: (keySelection) => {
    const nextKey = resolveKey(keySelection);

    set((state) => {
      if (state.mode !== nextKey.mode) {
        return {
          keySelection: nextKey.id,
          mode: nextKey.mode,
          selectedProgressionId: getDefaultProgressionId(nextKey.mode),
          activeProgressionStepIndex: 0,
          selectedChordDegree: null
        };
      }

      return {
        keySelection: nextKey.id,
        mode: nextKey.mode
      };
    });
  },

  selectProgressionPreset: (progressionId) => {
    set((state) => {
      ensureCompatibleProgressionPreset(state.mode, progressionId);

      return {
        selectedProgressionId: progressionId,
        activeProgressionStepIndex: 0,
        selectedChordDegree: null
      };
    });
  },

  selectActiveProgressionStep: (stepIndex) => {
    set((state) => {
      const preset = ensureCompatibleProgressionPreset(state.mode, state.selectedProgressionId);
      assertProgressionStepIndex(stepIndex, preset);

      return {
        activeProgressionStepIndex: stepIndex,
        selectedChordDegree: null
      };
    });
  },

  selectChordDegree: (degree) => {
    assertScaleDegree(degree);

    set((state) => {
      const preset = ensureCompatibleProgressionPreset(state.mode, state.selectedProgressionId);
      const matchingStep = preset.steps.find((step) => step.degree === degree);

      if (matchingStep !== undefined) {
        return {
          activeProgressionStepIndex: matchingStep.stepIndex,
          selectedChordDegree: null
        };
      }

      return {
        selectedChordDegree: degree
      };
    });
  },

  setChordLayerEnabled: (enabled) => {
    set({ chordLayerEnabled: enabled });
  },

  toggleChordLayer: () => {
    set((state) => ({ chordLayerEnabled: !state.chordLayerEnabled }));
  },

  setLabelMode: (labelMode) => {
    assertLabelMode(labelMode);
    set({ labelMode });
  },

  setLabelsVisible: (visible) => {
    set({ labelsVisible: visible });
  },

  toggleLabelsVisible: () => {
    set((state) => ({ labelsVisible: !state.labelsVisible }));
  },

  setFocusMode: (enabled) => {
    set({ focusMode: enabled });
  },

  toggleFocusMode: () => {
    set((state) => ({ focusMode: !state.focusMode }));
  },

  openTheoryOverlay: (contextTarget) => {
    assertTheoryOverlayContextTarget(contextTarget);

    set({
      theoryOverlay: {
        isOpen: true,
        contextTarget
      }
    });
  },

  closeTheoryOverlay: () => {
    set({
      theoryOverlay: {
        isOpen: false,
        contextTarget: null
      }
    });
  }
}));

function getDefaultProgressionId(mode: Mode): ProgressionId {
  return getProgressionPresets(mode)[0].id;
}

function resolveCompatibleKeyForMode(currentKey: KeyDefinition, mode: Mode): KeyDefinition {
  try {
    return resolveKey({ tonic: currentKey.tonic, mode });
  } catch {
    return getEnharmonicOptionsForPitchClass(currentKey.physicalPitchClass, mode)[0] ?? getSupportedKeys(mode)[0];
  }
}

function ensureCompatibleProgressionPreset(
  mode: Mode,
  progressionId: ProgressionId
): ProgressionPreset {
  const preset = getProgressionPresets(mode).find((candidate) => candidate.id === progressionId);

  if (preset === undefined) {
    throw new Error(`Progression "${progressionId}" is not compatible with the selected mode.`);
  }

  return preset;
}

function assertProgressionStepIndex(stepIndex: number, progression: ProgressionPreset): void {
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= progression.steps.length) {
    throw new Error(
      `Invalid progression step "${stepIndex}". Expected an integer from 0 to ${
        progression.steps.length - 1
      }.`
    );
  }
}

function assertScaleDegree(degree: number): asserts degree is ScaleDegree {
  if (!SCALE_DEGREES.some((candidate) => candidate === degree)) {
    throw new Error(`Invalid scale degree "${degree}". Expected an integer from 1 to 7.`);
  }
}

function assertSupportedMode(mode: Mode): void {
  if (mode !== 'major' && mode !== 'naturalMinor') {
    throw new Error(`Unsupported mode "${mode}". Expected "major" or "naturalMinor".`);
  }
}

function assertLabelMode(labelMode: LabelMode): void {
  if (labelMode !== 'notes' && labelMode !== 'degrees') {
    throw new Error(`Unsupported label mode "${labelMode}". Expected "notes" or "degrees".`);
  }
}

function assertTheoryOverlayContextTarget(
  contextTarget: TheoryOverlayContextTarget
): asserts contextTarget is TheoryOverlayContextTarget {
  if (!THEORY_OVERLAY_CONTEXT_TARGETS.some((candidate) => candidate === contextTarget)) {
    throw new Error(`Unsupported theory overlay context target "${contextTarget}".`);
  }
}
