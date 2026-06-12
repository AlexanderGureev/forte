import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialAppState, useAppStore } from '../app-state';
import type { MidiInputDevice } from '../../midi/types';
import type { MidiPressedNote } from '../../music/types';

const inputOne: MidiInputDevice = {
  id: 'input-one',
  name: 'Input One',
  manufacturer: null,
  connected: true
};

const inputTwo: MidiInputDevice = {
  id: 'input-two',
  name: 'Input Two',
  manufacturer: 'Acme',
  connected: true
};

function resetStore(): void {
  useAppStore.setState(createInitialAppState(), false);
}

function state() {
  return useAppStore.getState();
}

function midiNote(note: Partial<MidiPressedNote> = {}): MidiPressedNote {
  return {
    midiNoteNumber: note.midiNoteNumber ?? 60,
    physicalPitchClass: note.physicalPitchClass ?? 0,
    octave: note.octave ?? 4,
    velocity: note.velocity ?? 96
  };
}

function connectWithActiveNote(): void {
  state().setMidiConnected(inputOne.id, [inputOne, inputTwo]);
  state().pressMidiNote(midiNote());
}

describe('midi state', () => {
  beforeEach(() => {
    resetStore();
  });

  it('starts idle without active MIDI notes', () => {
    expect(state().midi).toEqual({
      status: 'idle',
      inputs: [],
      selectedInputId: null,
      activeNotes: [],
      errorMessage: null
    });
  });

  it('presses and releases an active MIDI note', () => {
    const note = midiNote({ velocity: 88 });

    state().pressMidiNote(note);

    expect(state().midi.activeNotes).toEqual([note]);

    state().releaseMidiNote(60);

    expect(state().midi.activeNotes).toEqual([]);
  });

  it('updates velocity on repeated press without duplicating the active note', () => {
    state().pressMidiNote(midiNote({ velocity: 64 }));
    state().pressMidiNote(midiNote({ velocity: 112 }));

    expect(state().midi.activeNotes).toEqual([midiNote({ velocity: 112 })]);
  });

  it('normalizes pressed MIDI notes through domain note mapping', () => {
    state().pressMidiNote({
      midiNoteNumber: 61,
      physicalPitchClass: 0,
      octave: 9,
      velocity: 96
    });

    expect(state().midi.activeNotes).toEqual([
      {
        midiNoteNumber: 61,
        physicalPitchClass: 1,
        octave: 4,
        velocity: 96
      }
    ]);
  });

  it('clears active MIDI notes when disconnecting, switching inputs, or entering error status', () => {
    connectWithActiveNote();
    state().disconnectMidiInput();

    expect(state().midi).toMatchObject({
      status: 'ready',
      selectedInputId: null,
      activeNotes: []
    });

    connectWithActiveNote();
    state().setMidiConnected(inputTwo.id, [inputOne, inputTwo]);

    expect(state().midi).toMatchObject({
      status: 'connected',
      selectedInputId: inputTwo.id,
      activeNotes: []
    });

    connectWithActiveNote();
    state().setMidiDisconnected('Device disconnected.', [inputTwo]);

    expect(state().midi).toMatchObject({
      status: 'disconnected',
      selectedInputId: null,
      activeNotes: [],
      errorMessage: 'Device disconnected.'
    });

    connectWithActiveNote();
    state().setMidiError('Unexpected MIDI error.');

    expect(state().midi).toMatchObject({
      status: 'error',
      selectedInputId: null,
      activeNotes: [],
      errorMessage: 'Unexpected MIDI error.'
    });
  });

  it('rejects invalid MIDI note numbers and velocities with readable errors', () => {
    expect(() => {
      state().pressMidiNote(midiNote({ midiNoteNumber: -1 }));
    }).toThrow(/Invalid MIDI note number "-1".*0 to 127/);

    expect(() => {
      state().pressMidiNote(midiNote({ midiNoteNumber: 60.5 }));
    }).toThrow(/Invalid MIDI note number "60.5".*0 to 127/);

    expect(() => {
      state().pressMidiNote(midiNote({ velocity: 0 }));
    }).toThrow(/Invalid MIDI velocity "0".*1 to 127/);

    expect(() => {
      state().pressMidiNote(midiNote({ velocity: 127.5 }));
    }).toThrow(/Invalid MIDI velocity "127.5".*1 to 127/);

    expect(() => {
      state().releaseMidiNote(128);
    }).toThrow(/Invalid MIDI note number "128".*0 to 127/);
  });
});
