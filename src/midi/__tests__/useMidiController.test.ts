import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialAppState, useAppStore } from '../../state/app-state';
import type { MidiInputDevice, MidiInputListeners } from '../types';
import { useMidiController } from '../useMidiController';
import type { MidiClient } from '../web-midi-client';

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

class FakeMidiClient implements MidiClient {
  supported = true;
  inputs: readonly MidiInputDevice[] = [];
  enableError: unknown = null;
  enableCalls = 0;
  stopListeningCalls = 0;
  readonly listenCalls: string[] = [];
  private listeners: MidiInputListeners[] = [];

  get activeListenerCount(): number {
    return this.listeners.length;
  }

  isSupported(): boolean {
    return this.supported;
  }

  async enable(): Promise<readonly MidiInputDevice[]> {
    this.enableCalls += 1;

    if (this.enableError !== null) {
      throw this.enableError;
    }

    return this.inputs;
  }

  listInputs(): readonly MidiInputDevice[] {
    return this.inputs;
  }

  listenToInput(inputId: string, listeners: MidiInputListeners): void {
    this.listenCalls.push(inputId);
    this.listeners.push(listeners);
  }

  stopListening(): void {
    this.stopListeningCalls += 1;
    this.listeners = [];
  }

  disable(): void {
    this.stopListening();
  }

  emitNoteOn(midiNoteNumber: number, velocity: number): void {
    for (const listener of [...this.listeners]) {
      listener.noteOn({ midiNoteNumber, velocity });
    }
  }

  emitNoteOff(midiNoteNumber: number, velocity = 0): void {
    for (const listener of [...this.listeners]) {
      listener.noteOff({ midiNoteNumber, velocity });
    }
  }

  emitInputsChanged(inputs: readonly MidiInputDevice[]): void {
    this.inputs = inputs;

    for (const listener of [...this.listeners]) {
      listener.inputsChanged(inputs);
    }
  }

  emitInputDisconnected(inputId: string): void {
    for (const listener of [...this.listeners]) {
      listener.inputDisconnected(inputId);
    }
  }

  emitError(message: string): void {
    for (const listener of [...this.listeners]) {
      listener.error(message);
    }
  }
}

function resetStore(): void {
  useAppStore.setState(createInitialAppState(), false);
}

function state() {
  return useAppStore.getState();
}

function renderMidiController(client: MidiClient) {
  return renderHook(() => useMidiController(client));
}

async function requestAccess(controller: ReturnType<typeof renderMidiController>): Promise<void> {
  await act(async () => {
    await controller.result.current.requestAccess();
  });
}

function selectInput(
  controller: ReturnType<typeof renderMidiController>,
  inputId: string
): void {
  act(() => {
    controller.result.current.selectInput(inputId);
  });
}

function disconnect(controller: ReturnType<typeof renderMidiController>): void {
  act(() => {
    controller.result.current.disconnect();
  });
}

function namedError(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;

  return error;
}

describe('useMidiController', () => {
  beforeEach(() => {
    resetStore();
  });

  it('maps unsupported access without enabling MIDI', async () => {
    const client = new FakeMidiClient();
    client.supported = false;

    await requestAccess(renderMidiController(client));

    expect(client.enableCalls).toBe(0);
    expect(state().midi).toMatchObject({
      status: 'unsupported',
      inputs: [],
      selectedInputId: null,
      activeNotes: [],
      errorMessage: 'Web MIDI is not supported in this browser or context.'
    });
  });

  it('maps permission denied access errors', async () => {
    const client = new FakeMidiClient();
    client.enableError = namedError('NotAllowedError', 'MIDI permission denied.');

    await requestAccess(renderMidiController(client));

    expect(state().midi).toMatchObject({
      status: 'permissionDenied',
      selectedInputId: null,
      activeNotes: [],
      errorMessage: 'MIDI permission denied.'
    });
  });

  it('maps no input devices after access is granted', async () => {
    const client = new FakeMidiClient();
    client.inputs = [];

    await requestAccess(renderMidiController(client));

    expect(client.listenCalls).toEqual([]);
    expect(state().midi).toMatchObject({
      status: 'noInputs',
      inputs: [],
      selectedInputId: null,
      activeNotes: []
    });
  });

  it('maps unexpected access errors', async () => {
    const client = new FakeMidiClient();
    client.enableError = new Error('MIDI driver failed.');

    await requestAccess(renderMidiController(client));

    expect(state().midi).toMatchObject({
      status: 'error',
      selectedInputId: null,
      activeNotes: [],
      errorMessage: 'MIDI driver failed.'
    });
  });

  it('auto-connects one input and starts listening', async () => {
    const client = new FakeMidiClient();
    client.inputs = [inputOne];

    await requestAccess(renderMidiController(client));

    expect(client.listenCalls).toEqual([inputOne.id]);
    expect(client.activeListenerCount).toBe(1);
    expect(state().midi).toMatchObject({
      status: 'connected',
      inputs: [inputOne],
      selectedInputId: inputOne.id,
      activeNotes: [],
      errorMessage: null
    });
  });

  it('leaves multiple inputs ready without selecting one', async () => {
    const client = new FakeMidiClient();
    client.inputs = [inputOne, inputTwo];

    await requestAccess(renderMidiController(client));

    expect(client.listenCalls).toEqual([]);
    expect(client.activeListenerCount).toBe(0);
    expect(state().midi).toMatchObject({
      status: 'ready',
      inputs: [inputOne, inputTwo],
      selectedInputId: null,
      activeNotes: []
    });
  });

  it('selects a new input after clearing old active notes and listeners', async () => {
    const client = new FakeMidiClient();
    client.inputs = [inputOne, inputTwo];
    const controller = renderMidiController(client);

    await requestAccess(controller);
    selectInput(controller, inputOne.id);

    act(() => {
      client.emitNoteOn(60, 96);
    });

    expect(state().midi.activeNotes).toHaveLength(1);

    selectInput(controller, inputTwo.id);

    expect(client.listenCalls).toEqual([inputOne.id, inputTwo.id]);
    expect(client.activeListenerCount).toBe(1);
    expect(state().midi).toMatchObject({
      status: 'connected',
      selectedInputId: inputTwo.id,
      activeNotes: []
    });
  });

  it('disconnects by stopping listeners and clearing active notes', async () => {
    const client = new FakeMidiClient();
    client.inputs = [inputOne];
    const controller = renderMidiController(client);

    await requestAccess(controller);

    act(() => {
      client.emitNoteOn(60, 96);
    });

    disconnect(controller);

    expect(client.activeListenerCount).toBe(0);
    expect(state().midi).toMatchObject({
      status: 'ready',
      selectedInputId: null,
      activeNotes: [],
      errorMessage: null
    });
  });

  it('updates active notes from noteon, noteoff, and noteon velocity zero callbacks', async () => {
    const client = new FakeMidiClient();
    client.inputs = [inputOne];

    await requestAccess(renderMidiController(client));

    act(() => {
      client.emitNoteOn(60, 88);
    });

    expect(state().midi.activeNotes).toEqual([
      {
        midiNoteNumber: 60,
        physicalPitchClass: 0,
        octave: 4,
        velocity: 88
      }
    ]);

    act(() => {
      client.emitNoteOff(60);
    });

    expect(state().midi.activeNotes).toEqual([]);

    act(() => {
      client.emitNoteOn(61, 92);
      client.emitNoteOn(61, 0);
    });

    expect(state().midi.activeNotes).toEqual([]);
  });

  it('does not accumulate duplicate listeners across repeated request and select calls', async () => {
    const client = new FakeMidiClient();
    client.inputs = [inputOne];
    const controller = renderMidiController(client);

    await requestAccess(controller);
    await requestAccess(controller);

    expect(client.activeListenerCount).toBe(1);

    selectInput(controller, inputOne.id);
    selectInput(controller, inputOne.id);

    expect(client.activeListenerCount).toBe(1);

    act(() => {
      client.emitNoteOn(60, 96);
    });

    expect(state().midi.activeNotes).toHaveLength(1);
  });

  it('handles selected input disappearance through adapter callbacks', async () => {
    const client = new FakeMidiClient();
    client.inputs = [inputOne];

    await requestAccess(renderMidiController(client));

    act(() => {
      client.emitNoteOn(60, 96);
      client.emitInputsChanged([inputTwo]);
    });

    expect(client.activeListenerCount).toBe(0);
    expect(state().midi).toMatchObject({
      status: 'disconnected',
      inputs: [inputTwo],
      selectedInputId: null,
      activeNotes: [],
      errorMessage: 'The selected MIDI input was disconnected.'
    });
  });

  it('handles selected input disconnected and adapter error callbacks', async () => {
    const client = new FakeMidiClient();
    client.inputs = [inputOne];

    await requestAccess(renderMidiController(client));

    act(() => {
      client.emitNoteOn(60, 96);
      client.emitInputDisconnected(inputOne.id);
    });

    expect(state().midi).toMatchObject({
      status: 'disconnected',
      selectedInputId: null,
      activeNotes: []
    });

    client.inputs = [inputOne];
    await requestAccess(renderMidiController(client));

    act(() => {
      client.emitError('Adapter failed.');
    });

    expect(client.activeListenerCount).toBe(0);
    expect(state().midi).toMatchObject({
      status: 'error',
      selectedInputId: null,
      activeNotes: [],
      errorMessage: 'Adapter failed.'
    });
  });
});
