import {
  WebMidi,
  type Input,
  type NoteMessageEvent,
  type PortEvent
} from 'webmidi';
import { assertMidiNoteNumber, assertMidiVelocity } from '../music/midi-notes';
import type { MidiNoteNumber } from '../music/types';
import type { MidiInputDevice, MidiInputListeners, MidiNoteInputEvent } from './types';

export interface MidiClient {
  readonly isSupported: () => boolean;
  readonly enable: () => Promise<readonly MidiInputDevice[]>;
  readonly listInputs: () => readonly MidiInputDevice[];
  readonly listenToInput: (inputId: string, listeners: MidiInputListeners) => void;
  readonly stopListening: () => void;
  readonly disable: () => void;
}

type NoteListener = (event: NoteMessageEvent) => void;
type PortListener = (event: PortEvent) => void;

interface ActiveInputListening {
  readonly input: Input;
  readonly inputId: string;
  readonly noteOn: NoteListener;
  readonly noteOff: NoteListener;
  readonly inputDisconnected: PortListener;
  readonly portsChanged: PortListener;
}

export function createWebMidiClient(): MidiClient {
  let activeListening: ActiveInputListening | null = null;

  function isSupported(): boolean {
    return hasBrowserMidiApi() && isSecureBrowserContext() && WebMidi.supported;
  }

  async function enable(): Promise<readonly MidiInputDevice[]> {
    if (!isSupported()) {
      throw new Error('Web MIDI is not supported in this browser or context.');
    }

    await WebMidi.enable();

    return listInputs();
  }

  function listInputs(): readonly MidiInputDevice[] {
    return WebMidi.inputs.map(normalizeInput);
  }

  function listenToInput(inputId: string, listeners: MidiInputListeners): void {
    stopListening();

    const input = findInput(inputId);

    if (input === undefined || input.state !== 'connected') {
      throw new Error(`MIDI input "${inputId}" was not found or is disconnected.`);
    }

    const noteOn = (event: NoteMessageEvent): void => {
      handleNoteMessage('noteon', event, listeners);
    };
    const noteOff = (event: NoteMessageEvent): void => {
      handleNoteMessage('noteoff', event, listeners);
    };
    const inputDisconnected = (): void => {
      listeners.inputDisconnected(inputId);
    };
    const portsChanged = (): void => {
      handlePortsChanged(inputId, listeners);
    };

    input.addListener('noteon', noteOn);
    input.addListener('noteoff', noteOff);
    input.addListener('disconnected', inputDisconnected);
    WebMidi.addListener('portschanged', portsChanged);

    activeListening = {
      input,
      inputId,
      noteOn,
      noteOff,
      inputDisconnected,
      portsChanged
    };
  }

  function stopListening(): void {
    if (activeListening === null) {
      return;
    }

    const listening = activeListening;
    activeListening = null;

    safeRemoveInputListener(listening.input, 'noteon', listening.noteOn);
    safeRemoveInputListener(listening.input, 'noteoff', listening.noteOff);
    safeRemoveInputListener(listening.input, 'disconnected', listening.inputDisconnected);
    safeRemoveWebMidiListener('portschanged', listening.portsChanged);
  }

  function disable(): void {
    stopListening();

    try {
      if (WebMidi.enabled) {
        void WebMidi.disable().catch(() => undefined);
      }
    } catch {
      // Disabling is best-effort cleanup; controller state is owned outside the adapter.
    }
  }

  function handlePortsChanged(inputId: string, listeners: MidiInputListeners): void {
    try {
      const inputs = listInputs();
      const selectedInput = inputs.find((input) => input.id === inputId);

      listeners.inputsChanged(inputs);

      if (selectedInput === undefined || !selectedInput.connected) {
        listeners.inputDisconnected(inputId);
      }
    } catch (error) {
      listeners.error(getErrorMessage(error));
    }
  }

  return {
    isSupported,
    enable,
    listInputs,
    listenToInput,
    stopListening,
    disable
  };
}

function hasBrowserMidiApi(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function';
}

function isSecureBrowserContext(): boolean {
  return typeof window === 'undefined' || window.isSecureContext !== false;
}

function normalizeInput(input: Input): MidiInputDevice {
  return {
    id: input.id,
    name: normalizeName(input.name, input.id),
    manufacturer: normalizeManufacturer(input.manufacturer),
    connected: input.state === 'connected'
  };
}

function normalizeName(name: string | undefined, fallbackId: string): string {
  const normalizedName = name?.trim();

  if (normalizedName) {
    return normalizedName;
  }

  return fallbackId;
}

function normalizeManufacturer(manufacturer: string | undefined): string | null {
  const normalizedManufacturer = manufacturer?.trim();

  return normalizedManufacturer || null;
}

function findInput(inputId: string): Input | undefined {
  try {
    return WebMidi.getInputById(inputId) as Input | undefined;
  } catch {
    return undefined;
  }
}

function handleNoteMessage(
  type: 'noteon' | 'noteoff',
  event: NoteMessageEvent,
  listeners: MidiInputListeners
): void {
  try {
    const noteEvent = normalizeNoteEvent(type, event);

    if (type === 'noteon' && noteEvent.velocity > 0) {
      listeners.noteOn(noteEvent);
      return;
    }

    listeners.noteOff(noteEvent);
  } catch (error) {
    listeners.error(getErrorMessage(error));
  }
}

function normalizeNoteEvent(
  type: 'noteon' | 'noteoff',
  event: NoteMessageEvent
): MidiNoteInputEvent {
  const midiNoteNumber = event.note.number as MidiNoteNumber;
  const velocity = getRawVelocity(type, event);

  assertMidiNoteNumber(midiNoteNumber);
  assertMidiRawVelocity(velocity);

  if (type === 'noteon' && velocity > 0) {
    assertMidiVelocity(velocity);
  }

  return {
    midiNoteNumber,
    velocity
  };
}

function getRawVelocity(type: 'noteon' | 'noteoff', event: NoteMessageEvent): number {
  const noteVelocity = type === 'noteon' ? event.note.rawAttack : event.note.rawRelease;

  if (Number.isInteger(noteVelocity)) {
    return noteVelocity;
  }

  const rawValue = event.rawValue;

  if (rawValue !== undefined && Number.isInteger(rawValue)) {
    return rawValue;
  }

  throw new Error('MIDI note velocity was not reported as a raw integer.');
}

function assertMidiRawVelocity(velocity: number): void {
  if (!Number.isInteger(velocity) || velocity < 0 || velocity > 127) {
    throw new Error(
      `Invalid MIDI raw velocity "${velocity}". Expected an integer from 0 to 127.`
    );
  }
}

function safeRemoveInputListener(
  input: Input,
  type: 'noteon' | 'noteoff' | 'disconnected',
  listener: NoteListener | PortListener
): void {
  try {
    input.removeListener(type, listener);
  } catch {
    // Listener cleanup must be idempotent even after device removal.
  }
}

function safeRemoveWebMidiListener(type: 'portschanged', listener: PortListener): void {
  try {
    WebMidi.removeListener(type, listener);
  } catch {
    // Listener cleanup must be idempotent even after WebMIDI.js disable.
  }
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
