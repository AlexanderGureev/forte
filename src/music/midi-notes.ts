import type { MidiNoteNumber, MidiPressedNote, PhysicalPitchClass } from './types';

export interface MidiNoteIdentity {
  readonly physicalPitchClass: PhysicalPitchClass;
  readonly octave: number;
}

export interface CreateMidiPressedNoteInput {
  readonly midiNoteNumber: MidiNoteNumber;
  readonly velocity: number;
}

export function getMidiNoteIdentity(midiNoteNumber: MidiNoteNumber): MidiNoteIdentity {
  assertMidiNoteNumber(midiNoteNumber);

  return {
    physicalPitchClass: (midiNoteNumber % 12) as PhysicalPitchClass,
    octave: Math.floor(midiNoteNumber / 12) - 1
  };
}

export function createMidiPressedNote({
  midiNoteNumber,
  velocity
}: CreateMidiPressedNoteInput): MidiPressedNote {
  assertMidiVelocity(velocity);

  return {
    midiNoteNumber,
    ...getMidiNoteIdentity(midiNoteNumber),
    velocity
  };
}

export function assertMidiNoteNumber(midiNoteNumber: MidiNoteNumber): void {
  if (!Number.isInteger(midiNoteNumber) || midiNoteNumber < 0 || midiNoteNumber > 127) {
    throw new Error(
      `Invalid MIDI note number "${midiNoteNumber}". Expected an integer from 0 to 127.`
    );
  }
}

export function assertMidiVelocity(velocity: number): void {
  if (!Number.isInteger(velocity) || velocity < 1 || velocity > 127) {
    throw new Error(`Invalid MIDI velocity "${velocity}". Expected an integer from 1 to 127.`);
  }
}
