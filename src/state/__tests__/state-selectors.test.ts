import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialAppState, useAppStore } from '../app-state';
import { createMidiPressedNote } from '../../music/midi-notes';
import {
  selectActiveChordStatus,
  selectActiveProgressionCards,
  selectChordList,
  selectColorLegend,
  selectCurrentKey,
  selectKeyboardViewModel,
  selectRecommendedKeys,
  selectScoreStaffViewModel,
  selectScaleSummary,
  selectTheoryOverlayModel
} from '../selectors';
import {
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
  DEFAULT_CAMERA_ZOOM
} from '../view-settings';
import type { MiniKeyboardKeyViewModel } from '../selectors';
import type {
  KeyboardKeyViewModel,
  PhysicalPitchClass,
  ScaleDisplayMode,
  ScoreStaffViewModel,
  StaffNoteViewModel,
  TheoryOverlayModel,
  TheoryOverlaySection
} from '../../music/types';

function resetStore(): void {
  useAppStore.setState(createInitialAppState(), false);
}

function state() {
  return useAppStore.getState();
}

function keyByPitchClass(
  keys: readonly KeyboardKeyViewModel[],
  physicalPitchClass: PhysicalPitchClass
): KeyboardKeyViewModel {
  const key = keys.find((candidate) => candidate.physicalPitchClass === physicalPitchClass);

  expect(key).toBeDefined();

  return key as KeyboardKeyViewModel;
}

function keyById(keys: readonly KeyboardKeyViewModel[], id: string): KeyboardKeyViewModel {
  const key = keys.find((candidate) => candidate.id === id);

  expect(key).toBeDefined();

  return key as KeyboardKeyViewModel;
}

function sectionById(
  model: TheoryOverlayModel,
  id: TheoryOverlaySection['id']
): TheoryOverlaySection {
  const section = model.sections.find((candidate) => candidate.id === id);

  expect(section).toBeDefined();

  return section as TheoryOverlaySection;
}

function requireScoreStaffViewModel(model: ScoreStaffViewModel | null): ScoreStaffViewModel {
  expect(model).not.toBeNull();

  return model as ScoreStaffViewModel;
}

function scoreNotes(model: ScoreStaffViewModel): readonly StaffNoteViewModel[] {
  return model.lines.flatMap((line) => line.notes);
}

function scoreNotesBySlot(model: ScoreStaffViewModel): readonly StaffNoteViewModel[] {
  return [...scoreNotes(model)].sort((left, right) => left.slotIndex - right.slotIndex);
}

function noteToken(note: StaffNoteViewModel): string {
  return `${note.noteName}${note.octave}`;
}

function pressMidiNote(midiNoteNumber: number): void {
  state().pressMidiNote(createMidiPressedNote({ midiNoteNumber, velocity: 96 }));
}

function midiPressedKeyIds(keys: readonly KeyboardKeyViewModel[]): readonly string[] {
  return keys
    .filter((key) => key.highlightLayers.includes('midiPressed'))
    .map((key) => key.id);
}

function midiPressedStaffNotes(model: ScoreStaffViewModel): readonly StaffNoteViewModel[] {
  return scoreNotes(model).filter((note) => note.highlightLayers.includes('midiPressed'));
}

function activeMiniKeyboardLabels(card: {
  readonly miniKeyboardKeys: readonly MiniKeyboardKeyViewModel[];
}): readonly string[] {
  return card.miniKeyboardKeys.flatMap((key) =>
    key.active && key.noteLabel !== null ? [key.noteLabel] : []
  );
}

describe('app state and selectors', () => {
  beforeEach(() => {
    resetStore();
  });

  it('starts in C Major with the default major progression and notes labels', () => {
    expect(state()).toMatchObject({
      keySelection: 'C Major',
      mode: 'major',
      selectedProgressionId: 'loop-1',
      activeProgressionStepIndex: 0,
      selectedChordDegree: null,
      chordLayerEnabled: true,
      chordEchoEnabled: false,
      scaleFingeringEnabled: false,
      scaleFingeringHand: 'right',
      scaleFingeringDirection: 'ascending',
      scaleDisplayMode: 'strip',
      labelMode: 'notes',
      labelsVisible: true,
      cameraZoom: DEFAULT_CAMERA_ZOOM,
      focusMode: false,
      theoryOverlay: {
        isOpen: false,
        contextTarget: null
      }
    });

    expect(selectCurrentKey(state()).id).toBe('C Major');
    expect(selectScaleSummary(state()).noteNames).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    expect(selectActiveChordStatus(state())).toMatchObject({
      source: 'progression',
      progressionId: 'loop-1',
      stepIndex: 0,
      degree: 1,
      chordName: 'C'
    });
    const progressionCards = selectActiveProgressionCards(state());

    expect(progressionCards.map((card) => card.active)).toEqual([true, false, false, false]);
    expect(progressionCards.map(activeMiniKeyboardLabels)).toEqual([
      ['C', 'E', 'G'],
      ['G', 'B', 'D'],
      ['A', 'C', 'E'],
      ['F', 'A', 'C']
    ]);
    const chordCards = selectChordList(state());

    expect(activeMiniKeyboardLabels(chordCards[0])).toEqual(['C', 'E', 'G']);
    expect(activeMiniKeyboardLabels(chordCards[6])).toEqual(['B', 'D', 'F']);
    expect(selectRecommendedKeys(state())[0]).toMatchObject({
      selected: true,
      sameMode: true
    });
    expect(selectColorLegend(state()).map((item) => item.id)).toEqual([
      'inScale',
      'tonic',
      'activeChord',
      'midiPressed',
      'chordRoot',
      'diminished'
    ]);
    expect(selectColorLegend(state()).find((item) => item.id === 'midiPressed')).toMatchObject({
      label: 'Нажато на MIDI',
      description: 'физически нажатая клавиша подключенной MIDI-клавиатуры'
    });

    state().setScaleFingeringEnabled(true);
    expect(selectColorLegend(state()).map((item) => item.id)).toEqual([
      'inScale',
      'tonic',
      'activeChord',
      'midiPressed',
      'chordRoot',
      'diminished',
      'fingering',
      'fingeringOnChord'
    ]);
  });

  it('switches scale display modes and rejects unsupported values', () => {
    const supportedModes = [
      'strip',
      'staffImprovisation',
      'staffPractice'
    ] as const satisfies readonly ScaleDisplayMode[];

    for (const scaleDisplayMode of supportedModes) {
      state().setScaleDisplayMode(scaleDisplayMode);

      expect(state().scaleDisplayMode).toBe(scaleDisplayMode);
    }

    expect(() => {
      state().setScaleDisplayMode('score' as ScaleDisplayMode);
    }).toThrow(/Unsupported scale display mode "score"/);
  });

  it('normalizes camera zoom changes', () => {
    state().setCameraZoom(1.21);

    expect(state().cameraZoom).toBe(1.21);

    state().setCameraZoom(2);

    expect(state().cameraZoom).toBe(CAMERA_ZOOM_MAX);

    state().setCameraZoom(0);

    expect(state().cameraZoom).toBe(CAMERA_ZOOM_MIN);

    state().setCameraZoom(Number.NaN);

    expect(state().cameraZoom).toBe(DEFAULT_CAMERA_ZOOM);

    state().setCameraZoom(1.2);
    state().resetCameraZoom();

    expect(state().cameraZoom).toBe(DEFAULT_CAMERA_ZOOM);
  });

  it('recalculates theory for a tonic change and preserves the active progression step', () => {
    state().selectActiveProgressionStep(2);
    state().selectKey({ tonic: 'F', mode: 'major' });

    expect(state()).toMatchObject({
      keySelection: 'F Major',
      mode: 'major',
      selectedProgressionId: 'loop-1',
      activeProgressionStepIndex: 2,
      selectedChordDegree: null
    });
    expect(selectScaleSummary(state()).noteNames).toEqual(['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);
    const progressionCards = selectActiveProgressionCards(state());

    expect(progressionCards.map((card) => card.chordName)).toEqual(['F', 'C', 'Dm', 'Bb']);
    expect(progressionCards.map(activeMiniKeyboardLabels)).toEqual([
      ['F', 'A', 'C'],
      ['C', 'E', 'G'],
      ['D', 'F', 'A'],
      ['Bb', 'D', 'F']
    ]);
    expect(selectActiveChordStatus(state())).toMatchObject({
      source: 'progression',
      stepIndex: 2,
      degree: 6,
      chordName: 'Dm'
    });
  });

  it('switches Major and Minor modes to compatible default progression presets', () => {
    state().selectProgressionPreset('classic');
    state().selectActiveProgressionStep(2);
    state().selectMode('naturalMinor');

    expect(state()).toMatchObject({
      keySelection: 'C Minor',
      mode: 'naturalMinor',
      selectedProgressionId: 'minor-loop',
      activeProgressionStepIndex: 0,
      selectedChordDegree: null
    });
    expect(selectActiveProgressionCards(state()).map((card) => card.chordName)).toEqual([
      'Cm',
      'Ab',
      'Eb',
      'Bb'
    ]);

    state().selectMode('major');

    expect(state()).toMatchObject({
      keySelection: 'C Major',
      mode: 'major',
      selectedProgressionId: 'loop-1',
      activeProgressionStepIndex: 0
    });
  });

  it('syncs the active progression step when a chosen chord degree exists in the pattern', () => {
    state().selectChordDegree(5);

    expect(state()).toMatchObject({
      selectedChordDegree: null,
      activeProgressionStepIndex: 1
    });
    expect(selectActiveChordStatus(state())).toMatchObject({
      source: 'progression',
      stepIndex: 1,
      degree: 5,
      chordName: 'G'
    });
    expect(selectActiveProgressionCards(state()).map((card) => card.active)).toEqual([
      false,
      true,
      false,
      false
    ]);
  });

  it('uses manual chord status for a chosen degree outside the current progression pattern', () => {
    state().selectChordDegree(2);

    expect(state().selectedChordDegree).toBe(2);
    expect(selectActiveChordStatus(state())).toMatchObject({
      source: 'manual',
      stepIndex: null,
      degree: 2,
      chordName: 'Dm'
    });
    expect(selectActiveProgressionCards(state())).toHaveLength(4);
    expect(selectActiveProgressionCards(state()).every((card) => !card.active)).toBe(true);
  });

  it('marks chord cards and keyboard layers for a manual diminished chord', () => {
    state().selectChordDegree(7);

    const chordCards = selectChordList(state());
    const diminishedChord = chordCards[6];

    expect(chordCards).toHaveLength(7);
    expect(diminishedChord).toMatchObject({
      degree: 7,
      chordName: 'Bdim',
      quality: 'diminished',
      tense: true,
      selected: true,
      inCurrentProgression: false
    });

    const keyboard = selectKeyboardViewModel(state(), 'desktop');

    expect(keyByPitchClass(keyboard.keys, 11).highlightLayers).toEqual([
      'inScale',
      'activeChord',
      'diminished'
    ]);
  });

  it('hides only the active chord highlight layer in Scale only mode', () => {
    const before = {
      keySelection: state().keySelection,
      selectedProgressionId: state().selectedProgressionId,
      activeProgressionStepIndex: state().activeProgressionStepIndex,
      selectedChordDegree: state().selectedChordDegree
    };
    const keyboardWithChordLayer = selectKeyboardViewModel(state(), 'desktop');
    const tonicKeyWithChordLayer = keyByPitchClass(keyboardWithChordLayer.keys, 0);

    expect(keyboardWithChordLayer).toMatchObject({
      viewport: 'desktop',
      octaveCount: 3
    });
    expect(keyboardWithChordLayer.keys).toHaveLength(36);
    expect(tonicKeyWithChordLayer.highlightLayers).toEqual([
      'inScale',
      'tonic',
      'activeChord'
    ]);

    state().setChordLayerEnabled(false);

    expect({
      keySelection: state().keySelection,
      selectedProgressionId: state().selectedProgressionId,
      activeProgressionStepIndex: state().activeProgressionStepIndex,
      selectedChordDegree: state().selectedChordDegree
    }).toEqual(before);
    expect(selectActiveChordStatus(state()).chordName).toBe('C');

    const keyboardWithoutChordLayer = selectKeyboardViewModel(state(), 'desktop');
    const tonicKeyWithoutChordLayer = keyByPitchClass(keyboardWithoutChordLayer.keys, 0);

    expect(tonicKeyWithoutChordLayer.highlightLayers).toEqual(['inScale', 'tonic']);
  });

  it('adds MIDI highlight to the exact C4 keyboard key only', () => {
    pressMidiNote(60);

    const keyboard = selectKeyboardViewModel(state(), 'desktop');

    expect(midiPressedKeyIds(keyboard.keys)).toEqual(['0-4']);
    expect(keyById(keyboard.keys, '0-3').highlightLayers).not.toContain('midiPressed');
    expect(keyById(keyboard.keys, '0-5').highlightLayers).not.toContain('midiPressed');
    expect(keyById(keyboard.keys, '0-4').highlightLayers).toEqual([
      'inScale',
      'tonic',
      'activeChord',
      'midiPressed'
    ]);
  });

  it('does not add keyboard MIDI highlight for out-of-range desktop notes', () => {
    pressMidiNote(36);

    expect(midiPressedKeyIds(selectKeyboardViewModel(state(), 'desktop').keys)).toEqual([]);
  });

  it('keeps C5 MIDI highlight on desktop and tablet but outside mobile keyboard keys', () => {
    pressMidiNote(72);

    expect(midiPressedKeyIds(selectKeyboardViewModel(state(), 'desktop').keys)).toEqual(['0-5']);
    expect(midiPressedKeyIds(selectKeyboardViewModel(state(), 'tablet').keys)).toEqual(['0-5']);
    expect(midiPressedKeyIds(selectKeyboardViewModel(state(), 'mobile').keys)).toEqual([]);
  });

  it('adds keyboard MIDI highlight for out-of-scale F#4 in C Major', () => {
    pressMidiNote(66);

    const keyboard = selectKeyboardViewModel(state(), 'desktop');
    const fSharp = keyById(keyboard.keys, '6-4');

    expect(fSharp).toMatchObject({
      scaleNote: null,
      noteLabel: null
    });
    expect(fSharp.highlightLayers).toEqual(['midiPressed']);
  });

  it('returns no score staff model for the strip display mode', () => {
    expect(selectScoreStaffViewModel(state(), 'desktop')).toBeNull();
  });

  it('builds continuous C Major desktop improvisation slots split at middle C', () => {
    state().setScaleDisplayMode('staffImprovisation');

    const model = requireScoreStaffViewModel(selectScoreStaffViewModel(state(), 'desktop'));
    const notes = scoreNotesBySlot(model);

    expect(model).toMatchObject({
      mode: 'staffImprovisation',
      key: {
        id: 'C Major'
      },
      keySignature: {
        accidental: 'natural',
        count: 0
      },
      slotCount: 21
    });
    expect(notes).toHaveLength(21);
    expect(notes.map((note) => note.slotIndex)).toEqual(
      Array.from({ length: 21 }, (_, index) => index)
    );
    expect(notes.map(noteToken)).toEqual([
      'C3',
      'D3',
      'E3',
      'F3',
      'G3',
      'A3',
      'B3',
      'C4',
      'D4',
      'E4',
      'F4',
      'G4',
      'A4',
      'B4',
      'C5',
      'D5',
      'E5',
      'F5',
      'G5',
      'A5',
      'B5'
    ]);
    expect(notes.filter((note) => note.clef === 'bass').map(noteToken)).toEqual([
      'C3',
      'D3',
      'E3',
      'F3',
      'G3',
      'A3',
      'B3'
    ]);
    expect(notes.filter((note) => note.clef === 'treble')[0]).toMatchObject({
      noteName: 'C',
      octave: 4,
      slotIndex: 7
    });
  });

  it('preserves signed key spelling and skips non-scale keys in improvisation slots', () => {
    state().selectKey('F Major');
    state().setScaleDisplayMode('staffImprovisation');

    const model = requireScoreStaffViewModel(selectScoreStaffViewModel(state(), 'desktop'));
    const notes = scoreNotesBySlot(model);
    const scalePitchClasses = new Set<PhysicalPitchClass>([0, 2, 4, 5, 7, 9, 10]);

    expect(model).toMatchObject({
      key: {
        id: 'F Major'
      },
      keySignature: {
        accidental: 'flat',
        count: 1,
        notes: ['B']
      },
      slotCount: 21
    });
    expect(notes.map((note) => note.noteName)).toContain('Bb');
    expect(notes.map((note) => note.noteName)).not.toContain('A#');
    expect(notes.every((note) => scalePitchClasses.has(note.physicalPitchClass))).toBe(true);
    expect(notes.map((note) => note.slotIndex)).toEqual(
      Array.from({ length: 21 }, (_, index) => index)
    );
  });

  it('does not add out-of-scale F#4 MIDI notes to the C Major staff model', () => {
    pressMidiNote(66);
    state().setScaleDisplayMode('staffImprovisation');

    const model = requireScoreStaffViewModel(selectScoreStaffViewModel(state(), 'desktop'));
    const notes = scoreNotes(model);

    expect(model.slotCount).toBe(21);
    expect(
      notes.some((note) => note.physicalPitchClass === 6 && note.octave === 4)
    ).toBe(false);
    expect(midiPressedStaffNotes(model)).toEqual([]);
  });

  it('gates improvisation active chord highlights with chordLayerEnabled', () => {
    state().setScaleDisplayMode('staffImprovisation');

    const withChordLayer = requireScoreStaffViewModel(selectScoreStaffViewModel(state(), 'desktop'));
    const activeChordPitchClasses = new Set(
      scoreNotes(withChordLayer)
        .filter((note) => note.highlightLayers.includes('activeChord'))
        .map((note) => note.physicalPitchClass)
    );

    expect(
      scoreNotes(withChordLayer).filter((note) => note.highlightLayers.includes('activeChord'))
    ).toHaveLength(9);
    expect(activeChordPitchClasses).toEqual(new Set([0, 4, 7]));

    state().setChordLayerEnabled(false);

    const withoutChordLayer = requireScoreStaffViewModel(
      selectScoreStaffViewModel(state(), 'desktop')
    );

    expect(
      scoreNotes(withoutChordLayer).filter((note) => note.highlightLayers.includes('activeChord'))
    ).toHaveLength(0);
  });

  it('keeps MIDI highlight when the active chord layer is disabled', () => {
    pressMidiNote(60);
    state().setScaleDisplayMode('staffImprovisation');
    state().setChordLayerEnabled(false);

    const keyboard = selectKeyboardViewModel(state(), 'desktop');
    const model = requireScoreStaffViewModel(selectScoreStaffViewModel(state(), 'desktop'));
    const [c4Note] = midiPressedStaffNotes(model);

    expect(keyById(keyboard.keys, '0-4').highlightLayers).toEqual([
      'inScale',
      'tonic',
      'midiPressed'
    ]);
    expect(c4Note).toMatchObject({
      noteName: 'C',
      octave: 4,
      highlightLayers: ['midiPressed']
    });
  });

  it('adds MIDI highlight to exact existing staff notes in improvisation and practice modes', () => {
    pressMidiNote(60);
    state().setChordLayerEnabled(false);
    state().setScaleDisplayMode('staffImprovisation');

    const improvisationModel = requireScoreStaffViewModel(
      selectScoreStaffViewModel(state(), 'desktop')
    );
    const improvisationMidiNotes = midiPressedStaffNotes(improvisationModel);

    expect(improvisationMidiNotes.map(noteToken)).toEqual(['C4']);
    expect(
      scoreNotes(improvisationModel).filter(
        (note) => note.physicalPitchClass === 0 && note.octave !== 4
      ).every((note) => !note.highlightLayers.includes('midiPressed'))
    ).toBe(true);

    state().setScaleDisplayMode('staffPractice');

    const practiceModel = requireScoreStaffViewModel(selectScoreStaffViewModel(state(), 'desktop'));
    const practiceMidiNotes = midiPressedStaffNotes(practiceModel);

    expect(practiceMidiNotes).toHaveLength(2);
    expect(practiceMidiNotes.map(noteToken)).toEqual(['C4', 'C4']);
    expect(
      scoreNotes(practiceModel).filter(
        (note) => note.physicalPitchClass === 0 && note.octave !== 4
      ).every((note) => !note.highlightLayers.includes('midiPressed'))
    ).toBe(true);
  });

  it('builds viewport-independent practice lines from the tonic nearest to C4', () => {
    state().setScaleDisplayMode('staffPractice');

    const desktopModel = requireScoreStaffViewModel(selectScoreStaffViewModel(state(), 'desktop'));
    const mobileModel = requireScoreStaffViewModel(selectScoreStaffViewModel(state(), 'mobile'));
    const [topLine, bottomLine] = desktopModel.lines;

    expect(desktopModel).toMatchObject({
      mode: 'staffPractice',
      slotCount: 15
    });
    expect(topLine).toMatchObject({ clef: 'treble' });
    expect(bottomLine).toMatchObject({ clef: 'bass' });
    expect(topLine.notes.map(noteToken)).toEqual([
      'C4',
      'D4',
      'E4',
      'F4',
      'G4',
      'A4',
      'B4',
      'C5',
      'D5',
      'E5',
      'F5',
      'G5',
      'A5',
      'B5',
      'C6'
    ]);
    expect(bottomLine.notes.map(noteToken)).toEqual([
      'C4',
      'B3',
      'A3',
      'G3',
      'F3',
      'E3',
      'D3',
      'C3',
      'B2',
      'A2',
      'G2',
      'F2',
      'E2',
      'D2',
      'C2'
    ]);
    expect(topLine.notes.map((note) => note.slotIndex)).toEqual(
      Array.from({ length: 15 }, (_, index) => index)
    );
    expect(bottomLine.notes.map((note) => note.slotIndex)).toEqual(
      Array.from({ length: 15 }, (_, index) => index)
    );
    expect(mobileModel.lines.map((line) => line.notes.map(noteToken))).toEqual(
      desktopModel.lines.map((line) => line.notes.map(noteToken))
    );
  });

  it('chooses the lower tonic octave for a practice anchor tie around C4', () => {
    state().selectKey('F# Major');
    state().setScaleDisplayMode('staffPractice');

    const model = requireScoreStaffViewModel(selectScoreStaffViewModel(state(), 'desktop'));
    const [topLine, bottomLine] = model.lines;

    expect(topLine.notes[0]).toMatchObject({
      noteName: 'F#',
      octave: 3
    });
    expect(topLine.notes[14]).toMatchObject({
      noteName: 'F#',
      octave: 5
    });
    expect(bottomLine.notes[0]).toMatchObject({
      noteName: 'F#',
      octave: 3
    });
    expect(bottomLine.notes[14]).toMatchObject({
      noteName: 'F#',
      octave: 1
    });
  });

  it('adds practice fingering only when scale fingering is enabled', () => {
    state().selectKey('F Major');
    state().setScaleDisplayMode('staffPractice');
    state().setScaleFingeringHand('left');
    state().setScaleFingeringDirection('descending');

    const disabledModel = requireScoreStaffViewModel(selectScoreStaffViewModel(state(), 'desktop'));

    expect(scoreNotes(disabledModel).every((note) => note.finger === null)).toBe(true);

    state().setScaleFingeringEnabled(true);

    const enabledModel = requireScoreStaffViewModel(selectScoreStaffViewModel(state(), 'desktop'));
    const [topLine, bottomLine] = enabledModel.lines;

    expect(topLine.notes.map((note) => note.finger)).toEqual([
      1,
      2,
      3,
      4,
      1,
      2,
      3,
      1,
      2,
      3,
      4,
      1,
      2,
      3,
      4
    ]);
    expect(bottomLine.notes.map((note) => note.finger)).toEqual([
      1,
      2,
      3,
      1,
      2,
      3,
      4,
      1,
      2,
      3,
      1,
      2,
      3,
      4,
      5
    ]);
    expect(
      scoreNotes(enabledModel).some((note) => note.highlightLayers.includes('activeChord'))
    ).toBe(false);
  });

  it('switches note and degree labels for major and natural minor independently from visibility', () => {
    state().setLabelMode('degrees');

    const cMajorKeyboard = selectKeyboardViewModel(state(), 'tablet');

    expect(cMajorKeyboard.octaveCount).toBe(3);
    expect(keyByPitchClass(cMajorKeyboard.keys, 4)).toMatchObject({
      noteLabel: 'E',
      degreeLabel: '3',
      visibleLabel: '3'
    });

    state().setLabelsVisible(false);

    expect(keyByPitchClass(selectKeyboardViewModel(state(), 'tablet').keys, 4)).toMatchObject({
      noteLabel: 'E',
      degreeLabel: '3',
      visibleLabel: null
    });

    state().setLabelsVisible(true);
    state().selectKey('A Minor');
    state().setLabelMode('degrees');

    const aMinorKeyboard = selectKeyboardViewModel(state(), 'mobile');

    expect(aMinorKeyboard.octaveCount).toBe(2);
    expect(aMinorKeyboard.keys).toHaveLength(24);
    expect(keyByPitchClass(aMinorKeyboard.keys, 0)).toMatchObject({
      noteLabel: 'C',
      degreeLabel: 'b3',
      visibleLabel: 'b3'
    });
    expect(keyByPitchClass(aMinorKeyboard.keys, 5)).toMatchObject({
      noteLabel: 'F',
      degreeLabel: 'b6',
      visibleLabel: 'b6'
    });
    expect(keyByPitchClass(aMinorKeyboard.keys, 7)).toMatchObject({
      noteLabel: 'G',
      degreeLabel: 'b7',
      visibleLabel: 'b7'
    });

    state().setLabelMode('notes');

    expect(keyByPitchClass(selectKeyboardViewModel(state(), 'mobile').keys, 0)).toMatchObject({
      visibleLabel: 'C'
    });
  });

  it('adds optional scale fingering without replacing note or degree labels', () => {
    expect(selectScaleSummary(state()).scaleFingering).toBeNull();

    state().toggleScaleFingering();

    expect(selectScaleSummary(state()).scaleFingering).toMatchObject({
      hand: 'right',
      direction: 'ascending',
      patternLabel: '1-2-3-1-2-3-4-5'
    });

    const ascendingKeyboard = selectKeyboardViewModel(state(), 'desktop');

    expect(keyById(ascendingKeyboard.keys, '0-3')).toMatchObject({
      visibleLabel: 'C',
      fingeringLabel: null
    });
    expect(keyById(ascendingKeyboard.keys, '0-4')).toMatchObject({
      visibleLabel: 'C',
      fingeringLabel: '1'
    });
    expect(keyById(ascendingKeyboard.keys, '5-4')).toMatchObject({
      visibleLabel: 'F',
      fingeringLabel: '1'
    });
    expect(keyById(ascendingKeyboard.keys, '0-5')).toMatchObject({
      visibleLabel: 'C',
      fingeringLabel: '5'
    });

    state().setScaleFingeringDirection('descending');

    const descendingKeyboard = selectKeyboardViewModel(state(), 'desktop');

    expect(keyById(descendingKeyboard.keys, '0-5')).toMatchObject({
      fingeringLabel: '5'
    });
    expect(keyById(descendingKeyboard.keys, '11-4')).toMatchObject({
      noteLabel: 'B',
      fingeringLabel: '4'
    });
    expect(keyById(descendingKeyboard.keys, '0-4')).toMatchObject({
      fingeringLabel: '1'
    });
  });

  it('toggles independent session UI flags and closes theory overlay without persistence', () => {
    state().toggleChordLayer();
    state().toggleChordEcho();
    state().toggleLabelsVisible();
    state().toggleScaleFingering();
    state().setScaleFingeringHand('left');
    state().setScaleFingeringDirection('descending');
    state().toggleFocusMode();
    state().openTheoryOverlay('progression');

    expect(state()).toMatchObject({
      chordLayerEnabled: false,
      chordEchoEnabled: true,
      labelsVisible: false,
      scaleFingeringEnabled: true,
      scaleFingeringHand: 'left',
      scaleFingeringDirection: 'descending',
      focusMode: true,
      theoryOverlay: {
        isOpen: true,
        contextTarget: 'progression'
      }
    });

    state().closeTheoryOverlay();

    expect(state().theoryOverlay).toEqual({
      isOpen: false,
      contextTarget: null
    });
  });

  it('builds a theory overlay model with relative key and key signature details', () => {
    state().selectKey('D Minor');
    state().openTheoryOverlay('key');

    const overlay = selectTheoryOverlayModel(state());

    expect(overlay).toMatchObject({
      isOpen: true,
      contextTarget: 'key',
      key: {
        id: 'D Minor'
      },
      relativeKey: {
        key: {
          id: 'F Major'
        }
      }
    });
    expect(overlay.sections.map((section) => section.id)).toEqual([
      'key',
      'scaleFormula',
      'scaleNotes',
      'scaleFingering',
      'keySignature',
      'diatonicChords',
      'activeChord',
      'progression',
      'relativeKey',
      'colorLegend'
    ]);
    expect(sectionById(overlay, 'keySignature')).toMatchObject({
      highlighted: true,
      rows: [
        { label: 'Тип', value: 'бемоли (b)' },
        { label: 'Количество', value: '1' },
        { label: 'Ноты', value: 'B' }
      ]
    });
    expect(sectionById(overlay, 'relativeKey')).toMatchObject({
      highlighted: true,
      rows: [
        { label: 'Связь', value: 'Параллельный мажор' },
        { label: 'Тональность', value: 'F Major' }
      ]
    });
    expect(sectionById(overlay, 'scaleFingering')).toMatchObject({
      highlighted: false,
      rows: expect.arrayContaining([
        { label: 'Ноты', value: 'D - E - F - G - A - Bb - C - D' },
        { label: 'Правая вверх', value: '1-2-3-1-2-3-4-5' }
      ])
    });
  });
});
