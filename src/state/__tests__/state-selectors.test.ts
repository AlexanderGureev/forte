import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialAppState, useAppStore } from '../app-state';
import {
  selectActiveChordStatus,
  selectActiveProgressionCards,
  selectChordList,
  selectColorLegend,
  selectCurrentKey,
  selectKeyboardViewModel,
  selectRecommendedKeys,
  selectScaleSummary,
  selectTheoryOverlayModel
} from '../selectors';
import type {
  KeyboardKeyViewModel,
  PhysicalPitchClass,
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

function sectionById(
  model: TheoryOverlayModel,
  id: TheoryOverlaySection['id']
): TheoryOverlaySection {
  const section = model.sections.find((candidate) => candidate.id === id);

  expect(section).toBeDefined();

  return section as TheoryOverlaySection;
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
      labelMode: 'notes',
      labelsVisible: true,
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
    expect(selectActiveProgressionCards(state()).map((card) => card.active)).toEqual([
      true,
      false,
      false,
      false
    ]);
    expect(selectRecommendedKeys(state())[0]).toMatchObject({
      selected: true,
      sameMode: true
    });
    expect(selectColorLegend().map((item) => item.id)).toEqual([
      'inScale',
      'tonic',
      'activeChord',
      'diminished'
    ]);
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
    expect(selectActiveProgressionCards(state()).map((card) => card.chordName)).toEqual([
      'F',
      'C',
      'Dm',
      'Bb'
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

  it('toggles independent session UI flags and closes theory overlay without persistence', () => {
    state().toggleChordLayer();
    state().toggleLabelsVisible();
    state().toggleFocusMode();
    state().openTheoryOverlay('progression');

    expect(state()).toMatchObject({
      chordLayerEnabled: false,
      labelsVisible: false,
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
  });
});
