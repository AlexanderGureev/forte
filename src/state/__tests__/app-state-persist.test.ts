import { beforeEach, describe, expect, it } from 'vitest';
import {
  APP_SETTINGS_STORAGE_KEY,
  createInitialAppState,
  useAppStore
} from '../app-state';
import { createMidiPressedNote } from '../../music/midi-notes';
import { DEFAULT_CAMERA_ZOOM } from '../view-settings';
import type { MidiInputDevice } from '../../midi/types';

interface PersistedStorageValue {
  readonly state: Record<string, unknown>;
  readonly version: number;
}

const inputOne: MidiInputDevice = {
  id: 'input-one',
  name: 'Input One',
  manufacturer: null,
  connected: true
};

function resetStore(): void {
  useAppStore.setState(createInitialAppState(), false);
  useAppStore.persist.clearStorage();
}

function state() {
  return useAppStore.getState();
}

function readPersistedState(): Record<string, unknown> {
  const rawValue = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);

  expect(rawValue).not.toBeNull();

  const value = JSON.parse(rawValue as string) as PersistedStorageValue;

  expect(value.version).toBe(1);

  return value.state;
}

function writePersistedState(persistedState: Record<string, unknown>): void {
  localStorage.setItem(
    APP_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      state: persistedState,
      version: 1
    })
  );
}

async function rehydrateStore(): Promise<void> {
  await Promise.resolve(useAppStore.persist.rehydrate());
}

describe('app state persistence', () => {
  beforeEach(() => {
    resetStore();
  });

  it('stores selected theory and view settings without runtime state', () => {
    state().selectKey('D Minor');
    state().selectProgressionPreset('minor-basic');
    state().selectActiveProgressionStep(2);
    state().selectChordDegree(2);
    state().setChordLayerEnabled(false);
    state().setChordEchoEnabled(true);
    state().setScaleFingeringEnabled(true);
    state().setScaleFingeringHand('left');
    state().setScaleFingeringDirection('descending');
    state().setScaleDisplayMode('staffPractice');
    state().setLabelMode('degrees');
    state().setLabelsVisible(false);
    state().setDimOutOfScale(true);
    state().setCameraZoom(1.2);
    state().toggleFocusMode();
    state().openTheoryOverlay('progression');
    state().setMidiConnected(inputOne.id, [inputOne]);
    state().pressMidiNote(createMidiPressedNote({ midiNoteNumber: 60, velocity: 96 }));

    const persistedState = readPersistedState();

    expect(persistedState).toEqual({
      keySelection: 'D Minor',
      mode: 'naturalMinor',
      selectedProgressionId: 'minor-basic',
      activeProgressionStepIndex: 2,
      selectedChordDegree: 2,
      chordLayerEnabled: false,
      chordEchoEnabled: true,
      scaleFingeringEnabled: true,
      scaleFingeringHand: 'left',
      scaleFingeringDirection: 'descending',
      scaleDisplayMode: 'staffPractice',
      labelMode: 'degrees',
      labelsVisible: false,
      dimOutOfScale: true,
      cameraZoom: 1.2
    });
    expect(persistedState).not.toHaveProperty('focusMode');
    expect(persistedState).not.toHaveProperty('theoryOverlay');
    expect(persistedState).not.toHaveProperty('midi');
  });

  it('hydrates persisted settings while keeping session-only state fresh', async () => {
    writePersistedState({
      keySelection: 'F Major',
      mode: 'major',
      selectedProgressionId: 'classic',
      activeProgressionStepIndex: 1,
      selectedChordDegree: null,
      chordLayerEnabled: false,
      chordEchoEnabled: true,
      scaleFingeringEnabled: true,
      scaleFingeringHand: 'left',
      scaleFingeringDirection: 'descending',
      scaleDisplayMode: 'staffImprovisation',
      labelMode: 'degrees',
      labelsVisible: false,
      dimOutOfScale: true,
      cameraZoom: 1.15,
      focusMode: true,
      theoryOverlay: {
        isOpen: true,
        contextTarget: 'progression'
      },
      midi: {
        status: 'connected',
        inputs: [inputOne],
        selectedInputId: inputOne.id,
        activeNotes: [createMidiPressedNote({ midiNoteNumber: 60, velocity: 96 })],
        errorMessage: null
      }
    });

    await rehydrateStore();

    expect(state()).toMatchObject({
      keySelection: 'F Major',
      mode: 'major',
      selectedProgressionId: 'classic',
      activeProgressionStepIndex: 1,
      selectedChordDegree: null,
      chordLayerEnabled: false,
      chordEchoEnabled: true,
      scaleFingeringEnabled: true,
      scaleFingeringHand: 'left',
      scaleFingeringDirection: 'descending',
      scaleDisplayMode: 'staffImprovisation',
      labelMode: 'degrees',
      labelsVisible: false,
      dimOutOfScale: true,
      cameraZoom: 1.15,
      focusMode: false,
      theoryOverlay: {
        isOpen: false,
        contextTarget: null
      },
      midi: {
        status: 'idle',
        inputs: [],
        selectedInputId: null,
        activeNotes: [],
        errorMessage: null
      }
    });
  });

  it('ignores invalid persisted fields and restores compatible defaults', async () => {
    writePersistedState({
      keySelection: 'H Major',
      mode: 'naturalMinor',
      selectedProgressionId: 'loop-1',
      activeProgressionStepIndex: 12,
      selectedChordDegree: 8,
      chordLayerEnabled: 'false',
      chordEchoEnabled: true,
      scaleFingeringEnabled: 'true',
      scaleFingeringHand: 'middle',
      scaleFingeringDirection: 'sideways',
      scaleDisplayMode: 'score',
      labelMode: 'names',
      labelsVisible: false,
      dimOutOfScale: 'yes',
      cameraZoom: 'wide'
    });

    await rehydrateStore();

    expect(state()).toMatchObject({
      keySelection: 'C Minor',
      mode: 'naturalMinor',
      selectedProgressionId: 'minor-loop',
      activeProgressionStepIndex: 0,
      selectedChordDegree: null,
      chordLayerEnabled: true,
      chordEchoEnabled: true,
      scaleFingeringEnabled: false,
      scaleFingeringHand: 'right',
      scaleFingeringDirection: 'ascending',
      scaleDisplayMode: 'strip',
      labelMode: 'notes',
      labelsVisible: false,
      dimOutOfScale: false,
      cameraZoom: DEFAULT_CAMERA_ZOOM
    });
  });

  it('canonicalizes persisted manual chords that are part of the active progression', async () => {
    writePersistedState({
      keySelection: 'C Major',
      mode: 'major',
      selectedProgressionId: 'classic',
      activeProgressionStepIndex: 0,
      selectedChordDegree: 5
    });

    await rehydrateStore();

    expect(state()).toMatchObject({
      selectedProgressionId: 'classic',
      activeProgressionStepIndex: 2,
      selectedChordDegree: null
    });
  });
});
