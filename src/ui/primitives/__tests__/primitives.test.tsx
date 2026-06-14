import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChordCard,
  KeySelector,
  MiniKeyboard,
  ProgressionCard,
  SegmentedControl,
  TheoryOverlay,
  getPrimitiveUiConfig,
  usePrimitiveHotkeys
} from '../index';
import { createInitialAppState, useAppStore } from '../../../state/app-state';
import type {
  ChordCardViewModel,
  MiniKeyboardKeyViewModel,
  ProgressionCardViewModel,
  RecommendedKeyViewModel
} from '../../../state/selectors';
import type {
  KeyDefinition,
  Mode,
  NoteName,
  PhysicalPitchClass,
  ScaleDegree,
  ScaleNote,
  TheoryOverlayContextTarget,
  TheoryOverlayModel
} from '../../../music/types';

function resetStore(): void {
  useAppStore.setState(createInitialAppState(), false);
}

function makeScaleNote(
  name: NoteName,
  physicalPitchClass: PhysicalPitchClass,
  degree: ScaleDegree
): ScaleNote {
  return {
    name,
    letter: name[0] as ScaleNote['letter'],
    accidental: name.includes('#') ? 'sharp' : name.includes('b') ? 'flat' : 'natural',
    physicalPitchClass,
    degree
  };
}

function makeMiniKey(
  physicalPitchClass: PhysicalPitchClass,
  active: boolean,
  noteLabel: NoteName | null = null
): MiniKeyboardKeyViewModel {
  const blackPitchClasses: readonly PhysicalPitchClass[] = [1, 3, 6, 8, 10];
  const isBlackKey = blackPitchClasses.includes(physicalPitchClass);

  return {
    id: `mini-${physicalPitchClass}`,
    physicalPitchClass,
    isWhiteKey: !isBlackKey,
    isBlackKey,
    noteLabel,
    active
  };
}

function makeMiniKeys(): readonly MiniKeyboardKeyViewModel[] {
  return [
    makeMiniKey(0, true, 'C'),
    makeMiniKey(1, false, 'Db'),
    makeMiniKey(2, false, 'D'),
    makeMiniKey(3, false, 'Eb'),
    makeMiniKey(4, true, 'E'),
    makeMiniKey(5, false, 'F'),
    makeMiniKey(6, false, 'Gb'),
    makeMiniKey(7, true, 'G'),
    makeMiniKey(8, false, 'Ab'),
    makeMiniKey(9, false, 'A'),
    makeMiniKey(10, false, 'Bb'),
    makeMiniKey(11, false, 'B')
  ];
}

function makeBdimMiniKeys(): readonly MiniKeyboardKeyViewModel[] {
  return [
    makeMiniKey(11, true, 'B'),
    makeMiniKey(0, false),
    makeMiniKey(1, false),
    makeMiniKey(2, true, 'D'),
    makeMiniKey(3, false),
    makeMiniKey(4, false),
    makeMiniKey(5, true, 'F'),
    makeMiniKey(6, false),
    makeMiniKey(7, false),
    makeMiniKey(8, false),
    makeMiniKey(9, false),
    makeMiniKey(10, false)
  ];
}

function makeKey(
  displayName: KeyDefinition['displayName'],
  mode: Mode,
  tonic: NoteName,
  physicalPitchClass: PhysicalPitchClass
): KeyDefinition {
  return {
    id: displayName,
    tonic,
    mode,
    physicalPitchClass,
    keySignature: {
      accidental: 'natural',
      count: 0,
      notes: []
    },
    signsCount: 0,
    difficulty: 'easy',
    recommended: true,
    displayName
  };
}

const cMajor = makeKey('C Major', 'major', 'C', 0);
const fMajor = makeKey('F Major', 'major', 'F', 5);
const aMinor = makeKey('A Minor', 'naturalMinor', 'A', 9);

describe('primitive components', () => {
  it('renders provided chord view models and keeps chord selection accessible', () => {
    const chord: ChordCardViewModel = {
      degree: 7,
      romanDegree: 'vii°',
      chordName: 'Bdim',
      quality: 'diminished',
      notes: [makeScaleNote('B', 11, 7), makeScaleNote('D', 2, 2), makeScaleNote('F', 5, 4)],
      miniKeyboardKeys: makeBdimMiniKeys(),
      tense: true,
      selected: true,
      inCurrentProgression: false
    };
    const handleSelect = vi.fn();

    render(<ChordCard chord={chord} onSelect={handleSelect} />);

    const button = screen.getByRole('button', {
      name: 'Выбрать аккорд Bdim, ступень vii°'
    });

    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.textContent).toContain('Bdim');
    expect(button.textContent).toContain('dim');
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('B, D, F');

    fireEvent.click(button);

    expect(handleSelect).toHaveBeenCalledWith(7);
  });

  it('highlights only active chord notes in the mini keyboard view model', () => {
    const { container } = render(<MiniKeyboard keys={makeMiniKeys()} />);

    const keyboard = screen.getByRole('img', {
      name: 'Мини-клавиатура аккорда: ноты аккорда C, E, G'
    });
    const activeKeys = container.querySelectorAll(
      '.primitive-mini-keyboard__key[data-active="true"]'
    );
    const inactiveDb = container.querySelector(
      '.primitive-mini-keyboard__key[data-pitch-class="1"]'
    );

    expect(keyboard).toBeTruthy();
    expect(activeKeys).toHaveLength(3);
    expect(inactiveDb?.getAttribute('data-active')).toBe('false');
  });

  it('renders progression cards with chord name, degree and a compact mini keyboard', () => {
    const card: ProgressionCardViewModel = {
      id: 'loop-1-0',
      progressionId: 'loop-1',
      stepIndex: 0,
      degree: 1,
      romanDegree: 'I',
      chordName: 'C',
      notes: [makeScaleNote('C', 0, 1), makeScaleNote('E', 4, 3), makeScaleNote('G', 7, 5)],
      active: true,
      miniKeyboardKeys: makeMiniKeys()
    };
    const handleSelectStep = vi.fn();

    render(<ProgressionCard card={card} onSelectStep={handleSelectStep} />);

    const button = screen.getByRole('button', {
      name: 'Выбрать шаг 1: C, ступень I'
    });

    const keyboard = screen.getByRole('img');

    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(keyboard.getAttribute('aria-label')).toContain('C, E, G');

    fireEvent.click(keyboard);

    expect(handleSelectStep).toHaveBeenCalledWith(0);
  });

  it('supports recommended keys and the full key selector without recomputing theory', () => {
    const recommendedKeys: readonly RecommendedKeyViewModel[] = [
      { key: cMajor, selected: true, sameMode: true },
      { key: aMinor, selected: false, sameMode: false }
    ];
    const supportedKeys = [
      { key: cMajor, selected: true },
      { key: fMajor, selected: false },
      { key: aMinor, selected: false }
    ];
    const handleSelectKey = vi.fn();

    render(
      <KeySelector
        recommendedKeys={recommendedKeys}
        supportedKeys={supportedKeys}
        onSelectKey={handleSelectKey}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Выбрать тональность A Minor' }));
    fireEvent.change(screen.getByLabelText('Все тональности'), {
      target: { value: 'F Major' }
    });

    expect(handleSelectKey).toHaveBeenNthCalledWith(1, aMinor);
    expect(handleSelectKey).toHaveBeenNthCalledWith(2, fMajor);
  });

  it('renders generic segmented controls for mode and labels', () => {
    const handleModeChange = vi.fn();
    const handleLabelChange = vi.fn();

    render(
      <>
        <SegmentedControl
          label="Лад"
          value="major"
          options={[
            { value: 'major', label: 'Major' },
            { value: 'naturalMinor', label: 'Minor' }
          ]}
          onChange={handleModeChange}
        />
        <SegmentedControl
          label="Подписи"
          value="notes"
          options={[
            { value: 'notes', label: 'Notes' },
            { value: 'degrees', label: 'Degrees' }
          ]}
          onChange={handleLabelChange}
        />
      </>
    );

    const minorButton = screen.getByRole('button', { name: 'Minor' });
    const degreesButton = screen.getByRole('button', { name: 'Degrees' });

    expect(screen.getByRole('button', { name: 'Major' }).getAttribute('aria-pressed')).toBe(
      'true'
    );

    fireEvent.click(minorButton);
    fireEvent.click(degreesButton);

    expect(handleModeChange).toHaveBeenCalledWith('naturalMinor');
    expect(handleLabelChange).toHaveBeenCalledWith('degrees');
  });

  it('renders theory overlay context highlighting and close action from the provided model', () => {
    const model: TheoryOverlayModel = {
      isOpen: true,
      contextTarget: 'progression',
      key: cMajor,
      relativeKey: {
        relationship: 'relativeMinor',
        key: aMinor
      },
      sections: [
        {
          id: 'key',
          title: 'Тональность',
          rows: [{ label: 'Название', value: 'C Major' }],
          items: [],
          highlighted: false
        },
        {
          id: 'progression',
          title: 'Прогрессия',
          rows: [{ label: 'Ступени', value: 'I - V - vi - IV' }],
          items: [],
          highlighted: true
        }
      ]
    };
    const handleClose = vi.fn();

    const { container } = render(<TheoryOverlay model={model} onClose={handleClose} />);

    expect(screen.getByRole('dialog', { name: 'C Major' })).toBeTruthy();
    expect(screen.getByText('Контекст: прогрессия')).toBeTruthy();
    expect(
      container
        .querySelector('[data-section-id="progression"]')
        ?.getAttribute('data-highlighted')
    ).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Закрыть теорию' }));

    expect(handleClose).toHaveBeenCalledOnce();
  });
});

describe('primitive hotkeys', () => {
  beforeEach(() => {
    resetStore();
  });

  it('calls state actions for progression, mode, labels, focus and overlay shortcuts', () => {
    render(<HotkeyHarness contextTarget="progression" />);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(useAppStore.getState().activeProgressionStepIndex).toBe(1);

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(useAppStore.getState().activeProgressionStepIndex).toBe(0);

    fireEvent.keyDown(window, { key: 'M' });
    expect(useAppStore.getState().mode).toBe('naturalMinor');

    fireEvent.keyDown(window, { key: 'L' });
    expect(useAppStore.getState().labelsVisible).toBe(false);

    fireEvent.keyDown(window, { key: 'D' });
    expect(useAppStore.getState().labelMode).toBe('degrees');

    fireEvent.keyDown(window, { key: 'F' });
    expect(useAppStore.getState().focusMode).toBe(true);

    fireEvent.keyDown(window, { key: '?' });
    expect(useAppStore.getState().theoryOverlay).toEqual({
      isOpen: true,
      contextTarget: 'progression'
    });
  });

  it('ignores editable controls so text entry does not trigger shortcuts', () => {
    render(<HotkeyHarness contextTarget="key" />);

    fireEvent.keyDown(screen.getByLabelText('Название сессии'), { key: 'D' });

    expect(useAppStore.getState().labelMode).toBe('notes');
  });
});

describe('primitive UI config', () => {
  it('hides secondary panels in focus mode and disables decorative motion on reduced motion', () => {
    expect(
      getPrimitiveUiConfig({ focusMode: true, prefersReducedMotion: true })
    ).toMatchObject({
      visiblePanels: {
        primaryControls: true,
        progression: true,
        keySelector: false,
        chordPanel: false,
        theoryHints: false,
        colorLegend: false
      },
      decorativeMotionEnabled: false,
      motionDurationMs: 0
    });

    expect(
      getPrimitiveUiConfig({ focusMode: false, prefersReducedMotion: false })
    ).toMatchObject({
      visiblePanels: {
        keySelector: true,
        chordPanel: true,
        theoryHints: true,
        colorLegend: true
      },
      decorativeMotionEnabled: true
    });
  });
});

function HotkeyHarness({
  contextTarget
}: {
  readonly contextTarget: TheoryOverlayContextTarget;
}) {
  usePrimitiveHotkeys({ theoryContextTarget: contextTarget });

  return <input aria-label="Название сессии" />;
}
