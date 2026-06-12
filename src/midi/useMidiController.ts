import { useCallback, useEffect, useState } from 'react';
import { createMidiPressedNote } from '../music/midi-notes';
import { useAppStore } from '../state/app-state';
import type { MidiInputDevice, MidiInputListeners, MidiNoteInputEvent } from './types';
import { createWebMidiClient, type MidiClient } from './web-midi-client';

export interface MidiController {
  readonly requestAccess: () => Promise<void>;
  readonly selectInput: (inputId: string) => void;
  readonly disconnect: () => void;
}

export function useMidiController(clientOverride?: MidiClient): MidiController {
  const [client] = useState<MidiClient>(() => clientOverride ?? createWebMidiClient());

  const createListeners = useCallback((): MidiInputListeners => {
    return createMidiInputListeners(client);
  }, [client]);

  const requestAccess = useCallback(async (): Promise<void> => {
    useAppStore.getState().setMidiRequesting();
    client.stopListening();

    if (!client.isSupported()) {
      useAppStore
        .getState()
        .setMidiUnsupported('Web MIDI is not supported in this browser or context.');
      return;
    }

    try {
      const inputs = await client.enable();

      if (inputs.length === 0) {
        useAppStore.getState().setMidiNoInputs();
        return;
      }

      if (inputs.length === 1) {
        connectToInput(client, inputs[0].id, inputs, createListeners(), false);
        return;
      }

      useAppStore.getState().setMidiReady(inputs);
    } catch (error) {
      applyMidiAccessError(error);
    }
  }, [client, createListeners]);

  const selectInput = useCallback(
    (inputId: string): void => {
      const inputs = useAppStore.getState().midi.inputs;

      try {
        connectToInput(client, inputId, inputs, createListeners(), true);
      } catch (error) {
        client.stopListening();
        useAppStore.getState().setMidiError(getErrorMessage(error));
      }
    },
    [client, createListeners]
  );

  const disconnect = useCallback((): void => {
    client.stopListening();
    useAppStore.getState().disconnectMidiInput();
  }, [client]);

  useEffect(() => {
    return () => {
      client.stopListening();
      useAppStore.getState().clearMidiNotes();
    };
  }, [client]);

  return {
    requestAccess,
    selectInput,
    disconnect
  };
}

function connectToInput(
  client: MidiClient,
  inputId: string,
  inputs: readonly MidiInputDevice[],
  listeners: MidiInputListeners,
  stopFirst: boolean
): void {
  if (stopFirst) {
    client.stopListening();
  }

  useAppStore.getState().clearMidiNotes();
  client.listenToInput(inputId, listeners);
  useAppStore.getState().setMidiConnected(inputId, inputs);
}

function createMidiInputListeners(client: MidiClient): MidiInputListeners {
  return {
    noteOn: (event) => {
      handleNoteOn(event);
    },
    noteOff: (event) => {
      handleNoteOff(event);
    },
    inputsChanged: (inputs) => {
      handleInputsChanged(client, inputs);
    },
    inputDisconnected: (inputId) => {
      handleInputDisconnected(client, inputId);
    },
    error: (message) => {
      client.stopListening();
      useAppStore.getState().setMidiError(message);
    }
  };
}

function handleNoteOn(event: MidiNoteInputEvent): void {
  try {
    if (event.velocity === 0) {
      useAppStore.getState().releaseMidiNote(event.midiNoteNumber);
      return;
    }

    useAppStore.getState().pressMidiNote(createMidiPressedNote(event));
  } catch (error) {
    useAppStore.getState().setMidiError(getErrorMessage(error));
  }
}

function handleNoteOff(event: MidiNoteInputEvent): void {
  try {
    useAppStore.getState().releaseMidiNote(event.midiNoteNumber);
  } catch (error) {
    useAppStore.getState().setMidiError(getErrorMessage(error));
  }
}

function handleInputsChanged(client: MidiClient, inputs: readonly MidiInputDevice[]): void {
  const midi = useAppStore.getState().midi;

  if (midi.selectedInputId !== null) {
    const selectedInput = inputs.find((input) => input.id === midi.selectedInputId);

    if (selectedInput === undefined || !selectedInput.connected) {
      client.stopListening();
      useAppStore
        .getState()
        .setMidiDisconnected('The selected MIDI input was disconnected.', inputs);
      return;
    }

    useAppStore.getState().setMidiInputs(inputs);
    return;
  }

  if (midi.status === 'ready' || midi.status === 'noInputs' || midi.status === 'disconnected') {
    if (inputs.length === 0) {
      useAppStore.getState().setMidiNoInputs();
      return;
    }

    useAppStore.getState().setMidiReady(inputs);
    return;
  }

  useAppStore.getState().setMidiInputs(inputs);
}

function handleInputDisconnected(client: MidiClient, inputId: string): void {
  const midi = useAppStore.getState().midi;
  const inputs = safeListInputs(client, midi.inputs);

  if (midi.selectedInputId !== inputId) {
    useAppStore.getState().setMidiInputs(inputs);
    return;
  }

  client.stopListening();
  useAppStore.getState().setMidiDisconnected('The selected MIDI input was disconnected.', inputs);
}

function safeListInputs(
  client: MidiClient,
  fallbackInputs: readonly MidiInputDevice[]
): readonly MidiInputDevice[] {
  try {
    return client.listInputs();
  } catch {
    return fallbackInputs;
  }
}

function applyMidiAccessError(error: unknown): void {
  const message = getErrorMessage(error);

  if (isPermissionDeniedError(error, message)) {
    useAppStore.getState().setMidiPermissionDenied(message);
    return;
  }

  if (isUnsupportedError(error, message)) {
    useAppStore.getState().setMidiUnsupported(message);
    return;
  }

  useAppStore.getState().setMidiError(message);
}

function isPermissionDeniedError(error: unknown, message: string): boolean {
  const name = error instanceof Error ? error.name : '';
  const normalizedName = name.toLowerCase();
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedName === 'notallowederror' ||
    normalizedName === 'securityerror' ||
    normalizedName.includes('permission') ||
    normalizedMessage.includes('permission') ||
    normalizedMessage.includes('denied')
  );
}

function isUnsupportedError(error: unknown, message: string): boolean {
  const name = error instanceof Error ? error.name : '';
  const normalizedName = name.toLowerCase();
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedName === 'notsupportederror' ||
    normalizedMessage.includes('not supported') ||
    normalizedMessage.includes('unsupported')
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message;
  }

  if (typeof error === 'string' && error.trim() !== '') {
    return error;
  }

  return 'Unexpected MIDI input error.';
}
