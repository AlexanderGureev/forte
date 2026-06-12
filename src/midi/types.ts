import type { MidiNoteNumber } from '../music/types';

export type MidiConnectionStatus =
  | 'idle'
  | 'requesting'
  | 'ready'
  | 'connected'
  | 'noInputs'
  | 'unsupported'
  | 'permissionDenied'
  | 'disconnected'
  | 'error';

export interface MidiInputDevice {
  readonly id: string;
  readonly name: string;
  readonly manufacturer: string | null;
  readonly connected: boolean;
}

export interface MidiNoteInputEvent {
  readonly midiNoteNumber: MidiNoteNumber;
  readonly velocity: number;
}

export interface MidiInputListeners {
  readonly noteOn: (event: MidiNoteInputEvent) => void;
  readonly noteOff: (event: MidiNoteInputEvent) => void;
  readonly inputsChanged: (inputs: readonly MidiInputDevice[]) => void;
  readonly inputDisconnected: (inputId: string) => void;
  readonly error: (message: string) => void;
}
