import { describe, expect, it } from 'vitest';
import { createMidiPressedNote, getMidiNoteIdentity } from '../midi-notes';

describe('MIDI note identity', () => {
  it.each([
    [48, { physicalPitchClass: 0, octave: 3 }],
    [60, { physicalPitchClass: 0, octave: 4 }],
    [72, { physicalPitchClass: 0, octave: 5 }]
  ] as const)('maps MIDI note %i to %o', (midiNoteNumber, expectedIdentity) => {
    expect(getMidiNoteIdentity(midiNoteNumber)).toEqual(expectedIdentity);
  });

  it.each([
    [49, { physicalPitchClass: 1, octave: 3 }],
    [51, { physicalPitchClass: 3, octave: 3 }],
    [54, { physicalPitchClass: 6, octave: 3 }],
    [56, { physicalPitchClass: 8, octave: 3 }],
    [58, { physicalPitchClass: 10, octave: 3 }]
  ] as const)('maps black-key MIDI note %i to %o', (midiNoteNumber, expectedIdentity) => {
    expect(getMidiNoteIdentity(midiNoteNumber)).toEqual(expectedIdentity);
  });

  it('creates pressed notes with deterministic identity and raw velocity', () => {
    expect(createMidiPressedNote({ midiNoteNumber: 61, velocity: 127 })).toEqual({
      midiNoteNumber: 61,
      physicalPitchClass: 1,
      octave: 4,
      velocity: 127
    });
  });

  it('rejects invalid MIDI note numbers with readable errors', () => {
    expect(() => getMidiNoteIdentity(-1)).toThrow(
      /Invalid MIDI note number "-1".*0 to 127/
    );
    expect(() => getMidiNoteIdentity(128)).toThrow(
      /Invalid MIDI note number "128".*0 to 127/
    );
    expect(() => getMidiNoteIdentity(60.5)).toThrow(
      /Invalid MIDI note number "60.5".*0 to 127/
    );
  });

  it('rejects invalid MIDI velocities with readable errors', () => {
    expect(() => createMidiPressedNote({ midiNoteNumber: 60, velocity: 0 })).toThrow(
      /Invalid MIDI velocity "0".*1 to 127/
    );
    expect(() => createMidiPressedNote({ midiNoteNumber: 60, velocity: 128 })).toThrow(
      /Invalid MIDI velocity "128".*1 to 127/
    );
    expect(() => createMidiPressedNote({ midiNoteNumber: 60, velocity: 64.5 })).toThrow(
      /Invalid MIDI velocity "64.5".*1 to 127/
    );
  });
});
