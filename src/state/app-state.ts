import { create } from 'zustand';
import { getEnharmonicOptionsForPitchClass, getSupportedKeys, resolveKey } from '../music/keys';
import { assertMidiNoteNumber, createMidiPressedNote } from '../music/midi-notes';
import { getProgressionPresets } from '../music/progressions';
import type { MidiConnectionStatus, MidiInputDevice } from '../midi/types';
import type {
  KeyDefinition,
  KeySelection,
  LabelMode,
  MidiNoteNumber,
  MidiPressedNote,
  Mode,
  ProgressionId,
  ProgressionPreset,
  ScaleFingeringDirection,
  ScaleFingeringHand,
  ScaleDegree,
  ScaleDisplayMode,
  TheoryOverlayContextTarget
} from '../music/types';

export interface TheoryOverlayState {
  readonly isOpen: boolean;
  readonly contextTarget: TheoryOverlayContextTarget | null;
}

export interface MidiRuntimeState {
  readonly status: MidiConnectionStatus;
  readonly inputs: readonly MidiInputDevice[];
  readonly selectedInputId: string | null;
  readonly activeNotes: readonly MidiPressedNote[];
  readonly errorMessage: string | null;
}

export interface AppState {
  readonly keySelection: KeySelection;
  readonly mode: Mode;
  readonly selectedProgressionId: ProgressionId;
  readonly activeProgressionStepIndex: number;
  readonly selectedChordDegree: ScaleDegree | null;
  readonly chordLayerEnabled: boolean;
  readonly scaleFingeringEnabled: boolean;
  readonly scaleFingeringHand: ScaleFingeringHand;
  readonly scaleFingeringDirection: ScaleFingeringDirection;
  readonly scaleDisplayMode: ScaleDisplayMode;
  readonly labelMode: LabelMode;
  readonly labelsVisible: boolean;
  readonly focusMode: boolean;
  readonly theoryOverlay: TheoryOverlayState;
  readonly midi: MidiRuntimeState;
}

export interface AppActions {
  readonly selectMode: (mode: Mode) => void;
  readonly selectKey: (keySelection: KeySelection) => void;
  readonly selectProgressionPreset: (progressionId: ProgressionId) => void;
  readonly selectActiveProgressionStep: (stepIndex: number) => void;
  readonly selectChordDegree: (degree: ScaleDegree) => void;
  readonly setChordLayerEnabled: (enabled: boolean) => void;
  readonly toggleChordLayer: () => void;
  readonly setScaleFingeringEnabled: (enabled: boolean) => void;
  readonly toggleScaleFingering: () => void;
  readonly setScaleFingeringHand: (hand: ScaleFingeringHand) => void;
  readonly setScaleFingeringDirection: (direction: ScaleFingeringDirection) => void;
  readonly setScaleDisplayMode: (mode: ScaleDisplayMode) => void;
  readonly setLabelMode: (labelMode: LabelMode) => void;
  readonly setLabelsVisible: (visible: boolean) => void;
  readonly toggleLabelsVisible: () => void;
  readonly setFocusMode: (enabled: boolean) => void;
  readonly toggleFocusMode: () => void;
  readonly openTheoryOverlay: (contextTarget: TheoryOverlayContextTarget) => void;
  readonly closeTheoryOverlay: () => void;
  readonly setMidiRequesting: () => void;
  readonly setMidiReady: (inputs: readonly MidiInputDevice[]) => void;
  readonly setMidiConnected: (inputId: string, inputs: readonly MidiInputDevice[]) => void;
  readonly setMidiNoInputs: () => void;
  readonly setMidiUnsupported: (message: string) => void;
  readonly setMidiPermissionDenied: (message: string) => void;
  readonly setMidiDisconnected: (
    message: string,
    inputs: readonly MidiInputDevice[]
  ) => void;
  readonly setMidiError: (message: string) => void;
  readonly setMidiInputs: (inputs: readonly MidiInputDevice[]) => void;
  readonly disconnectMidiInput: () => void;
  readonly pressMidiNote: (note: MidiPressedNote) => void;
  readonly releaseMidiNote: (midiNoteNumber: MidiNoteNumber) => void;
  readonly clearMidiNotes: () => void;
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

const SCALE_FINGERING_HANDS = ['right', 'left'] as const satisfies readonly ScaleFingeringHand[];
const SCALE_FINGERING_DIRECTIONS = [
  'ascending',
  'descending'
] as const satisfies readonly ScaleFingeringDirection[];
const SCALE_DISPLAY_MODES = [
  'strip',
  'staffImprovisation',
  'staffPractice'
] as const satisfies readonly ScaleDisplayMode[];

export function createInitialAppState(): AppState {
  const key = resolveKey(DEFAULT_KEY_SELECTION);

  return {
    keySelection: key.id,
    mode: key.mode,
    selectedProgressionId: getDefaultProgressionId(key.mode),
    activeProgressionStepIndex: 0,
    selectedChordDegree: null,
    chordLayerEnabled: true,
    scaleFingeringEnabled: false,
    scaleFingeringHand: 'right',
    scaleFingeringDirection: 'ascending',
    scaleDisplayMode: 'strip',
    labelMode: 'notes',
    labelsVisible: true,
    focusMode: false,
    theoryOverlay: {
      isOpen: false,
      contextTarget: null
    },
    midi: createInitialMidiState()
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

  setScaleFingeringEnabled: (enabled) => {
    set({ scaleFingeringEnabled: enabled });
  },

  toggleScaleFingering: () => {
    set((state) => ({ scaleFingeringEnabled: !state.scaleFingeringEnabled }));
  },

  setScaleFingeringHand: (hand) => {
    assertScaleFingeringHand(hand);
    set({ scaleFingeringHand: hand });
  },

  setScaleFingeringDirection: (direction) => {
    assertScaleFingeringDirection(direction);
    set({ scaleFingeringDirection: direction });
  },

  setScaleDisplayMode: (mode) => {
    assertScaleDisplayMode(mode);
    set({ scaleDisplayMode: mode });
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
  },

  setMidiRequesting: () => {
    set((state) => ({
      midi: {
        ...state.midi,
        status: 'requesting',
        selectedInputId: null,
        activeNotes: [],
        errorMessage: null
      }
    }));
  },

  setMidiReady: (inputs) => {
    set({
      midi: {
        status: 'ready',
        inputs: [...inputs],
        selectedInputId: null,
        activeNotes: [],
        errorMessage: null
      }
    });
  },

  setMidiConnected: (inputId, inputs) => {
    set((state) => ({
      midi: {
        status: 'connected',
        inputs: [...inputs],
        selectedInputId: inputId,
        activeNotes:
          state.midi.status === 'connected' && state.midi.selectedInputId === inputId
            ? state.midi.activeNotes
            : [],
        errorMessage: null
      }
    }));
  },

  setMidiNoInputs: () => {
    set({
      midi: {
        status: 'noInputs',
        inputs: [],
        selectedInputId: null,
        activeNotes: [],
        errorMessage: null
      }
    });
  },

  setMidiUnsupported: (message) => {
    set({
      midi: {
        status: 'unsupported',
        inputs: [],
        selectedInputId: null,
        activeNotes: [],
        errorMessage: message
      }
    });
  },

  setMidiPermissionDenied: (message) => {
    set({
      midi: {
        status: 'permissionDenied',
        inputs: [],
        selectedInputId: null,
        activeNotes: [],
        errorMessage: message
      }
    });
  },

  setMidiDisconnected: (message, inputs) => {
    set({
      midi: {
        status: 'disconnected',
        inputs: [...inputs],
        selectedInputId: null,
        activeNotes: [],
        errorMessage: message
      }
    });
  },

  setMidiError: (message) => {
    set((state) => ({
      midi: {
        ...state.midi,
        status: 'error',
        selectedInputId: null,
        activeNotes: [],
        errorMessage: message
      }
    }));
  },

  setMidiInputs: (inputs) => {
    set((state) => ({
      midi: {
        ...state.midi,
        inputs: [...inputs]
      }
    }));
  },

  disconnectMidiInput: () => {
    set((state) => ({
      midi: {
        ...state.midi,
        status: state.midi.inputs.length > 0 ? 'ready' : 'noInputs',
        selectedInputId: null,
        activeNotes: [],
        errorMessage: null
      }
    }));
  },

  pressMidiNote: (note) => {
    const pressedNote = createMidiPressedNote(note);

    set((state) => {
      const activeNoteIndex = state.midi.activeNotes.findIndex(
        (activeNote) => activeNote.midiNoteNumber === pressedNote.midiNoteNumber
      );
      const activeNotes =
        activeNoteIndex === -1
          ? [...state.midi.activeNotes, pressedNote]
          : state.midi.activeNotes.map((activeNote, index) =>
              index === activeNoteIndex ? pressedNote : activeNote
            );

      return {
        midi: {
          ...state.midi,
          activeNotes
        }
      };
    });
  },

  releaseMidiNote: (midiNoteNumber) => {
    assertMidiNoteNumber(midiNoteNumber);

    set((state) => ({
      midi: {
        ...state.midi,
        activeNotes: state.midi.activeNotes.filter(
          (activeNote) => activeNote.midiNoteNumber !== midiNoteNumber
        )
      }
    }));
  },

  clearMidiNotes: () => {
    set((state) => ({
      midi: {
        ...state.midi,
        activeNotes: []
      }
    }));
  }
}));

function createInitialMidiState(): MidiRuntimeState {
  return {
    status: 'idle',
    inputs: [],
    selectedInputId: null,
    activeNotes: [],
    errorMessage: null
  };
}

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

function assertScaleFingeringHand(hand: ScaleFingeringHand): void {
  if (!SCALE_FINGERING_HANDS.some((candidate) => candidate === hand)) {
    throw new Error(`Unsupported scale fingering hand "${hand}".`);
  }
}

function assertScaleFingeringDirection(direction: ScaleFingeringDirection): void {
  if (!SCALE_FINGERING_DIRECTIONS.some((candidate) => candidate === direction)) {
    throw new Error(`Unsupported scale fingering direction "${direction}".`);
  }
}

function assertScaleDisplayMode(mode: ScaleDisplayMode): void {
  if (!SCALE_DISPLAY_MODES.some((candidate) => candidate === mode)) {
    throw new Error(
      `Unsupported scale display mode "${mode}". Expected "strip", "staffImprovisation", or "staffPractice".`
    );
  }
}

function assertTheoryOverlayContextTarget(
  contextTarget: TheoryOverlayContextTarget
): asserts contextTarget is TheoryOverlayContextTarget {
  if (!THEORY_OVERLAY_CONTEXT_TARGETS.some((candidate) => candidate === contextTarget)) {
    throw new Error(`Unsupported theory overlay context target "${contextTarget}".`);
  }
}
