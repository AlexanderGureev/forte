import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScoreStaff } from '../ScoreStaff';
import type {
  KeyDefinition,
  KeySignature,
  Mode,
  NoteName,
  PhysicalPitchClass,
  PianoFinger,
  ScaleDegree,
  ScoreStaffViewModel,
  StaffClef,
  StaffHighlightLayer,
  StaffNoteViewModel
} from '../../../music/types';

describe('ScoreStaff', () => {
  it('renders an accessible score container and SVG for a simple C Major model', async () => {
    const onOpenTheory = vi.fn();
    const { container } = render(
      <ScoreStaff model={makeModel(cMajor)} onOpenTheory={onOpenTheory} />
    );

    expect(
      screen.getByRole('img', {
        name: 'Партитура гаммы C Major, режим Практика'
      })
    ).toBeTruthy();

    await waitFor(() => {
      expect(container.querySelectorAll('.hud-score-staff__renderer svg')).toHaveLength(1);
    });
  });

  it('clears the old SVG when rerendered with a different model', async () => {
    const { container, rerender } = render(
      <ScoreStaff model={makeModel(cMajor)} onOpenTheory={vi.fn()} />
    );

    await waitFor(() => {
      expect(container.querySelectorAll('.hud-score-staff__renderer svg')).toHaveLength(1);
    });

    rerender(<ScoreStaff model={makeModel(fMajor)} onOpenTheory={vi.fn()} />);

    await waitFor(() => {
      expect(container.querySelectorAll('.hud-score-staff__renderer svg')).toHaveLength(1);
    });

    expect(screen.getByRole('img').getAttribute('data-key-signature-treble')).toBe('F');
  });

  it('renders note, degree and finger labels through stable data attributes', async () => {
    const { container } = render(
      <ScoreStaff model={makeModel(cMajor)} onOpenTheory={vi.fn()} />
    );

    await waitFor(() => {
      expect(container.querySelectorAll('.hud-score-staff__renderer svg')).toHaveLength(1);
    });

    expect(
      container.querySelector(
        '.hud-score-staff__label[data-clef="treble"][data-note-name="C"][data-degree-label="1"][data-finger="1"]'
      )
    ).toBeTruthy();
    expect(
      container.querySelector(
        '.hud-score-staff__label[data-clef="bass"][data-note-name="B"][data-degree-label="7"][data-finger="5"]'
      )
    ).toBeTruthy();
  });

  it('marks MIDI-pressed staff labels with stable data attributes', async () => {
    const { container } = render(
      <ScoreStaff
        model={withNoteHighlightLayers(makeModel(cMajor), 'treble-0', ['midiPressed'])}
        onOpenTheory={vi.fn()}
      />
    );

    await waitForRenderedScore(container);

    const label = requireElement(
      container,
      '.hud-score-staff__label[data-clef="treble"][data-slot-index="0"]'
    );

    expect(label.getAttribute('data-midi-pressed')).toBe('true');
    expect(label.getAttribute('data-highlight-layers')).toBe('midiPressed');
    expect(label.getAttribute('data-highlight-priority')).toBe('midiPressed');
    expect(label.style.left).not.toBe('');
    expect(label.style.top).not.toBe('');
    expect(label.querySelector('.hud-score-staff__label-note')?.textContent).toBe('C');
    expect(label.querySelector('.hud-score-staff__label-degree')?.textContent).toBe('1');
    expect(label.querySelector('.hud-score-staff__label-finger')?.textContent).toBe('1');
  });

  it('keeps MIDI priority when active chord and MIDI highlights overlap', async () => {
    const { container } = render(
      <ScoreStaff
        model={withNoteHighlightLayers(makeModel(cMajor), 'treble-1', [
          'activeChord',
          'midiPressed'
        ])}
        onOpenTheory={vi.fn()}
      />
    );

    await waitForRenderedScore(container);

    const label = requireElement(
      container,
      '.hud-score-staff__label[data-clef="treble"][data-slot-index="1"]'
    );

    expect(label.getAttribute('data-midi-pressed')).toBe('true');
    expect(label.getAttribute('data-highlight-layers')).toBe('activeChord midiPressed');
    expect(label.getAttribute('data-highlight-priority')).toBe('midiPressed');
    expect(label.querySelector('.hud-score-staff__label-note')?.textContent).toBe('D');
    expect(label.querySelector('.hud-score-staff__label-degree')?.textContent).toBe('2');
  });

  it('exposes the VexFlow key signature contract for both staves', async () => {
    const { container } = render(
      <ScoreStaff model={makeModel(fMajor)} onOpenTheory={vi.fn()} />
    );

    await waitFor(() => {
      expect(container.querySelectorAll('.hud-score-staff__renderer svg')).toHaveLength(1);
    });

    const score = screen.getByRole('img');

    expect(score.getAttribute('data-key-signature-treble')).toBe('F');
    expect(score.getAttribute('data-key-signature-bass')).toBe('F');
  });

  it('keeps the scale theory info action available', () => {
    const onOpenTheory = vi.fn();

    render(<ScoreStaff model={makeModel(cMajor)} onOpenTheory={onOpenTheory} />);

    fireEvent.click(screen.getByRole('button', { name: 'Подробнее о гамме' }));

    expect(onOpenTheory).toHaveBeenCalledWith('scale');
  });
});

async function waitForRenderedScore(container: HTMLElement): Promise<void> {
  await waitFor(() => {
    expect(container.querySelectorAll('.hud-score-staff__renderer svg')).toHaveLength(1);
    expect(container.querySelectorAll('.hud-score-staff__label').length).toBeGreaterThan(0);
  });
}

function requireElement(container: HTMLElement, selector: string): HTMLElement {
  const element = container.querySelector(selector);

  expect(element).toBeTruthy();

  return element as HTMLElement;
}

function withNoteHighlightLayers(
  model: ScoreStaffViewModel,
  noteId: string,
  highlightLayers: readonly StaffHighlightLayer[]
): ScoreStaffViewModel {
  const updateLine = (line: ScoreStaffViewModel['lines'][number]) => ({
    ...line,
    notes: line.notes.map((note) =>
      note.id === noteId
        ? {
            ...note,
            highlightLayers
          }
        : note
    )
  });

  return {
    ...model,
    lines: [updateLine(model.lines[0]), updateLine(model.lines[1])]
  };
}

function makeModel(key: KeyDefinition): ScoreStaffViewModel {
  return {
    mode: 'staffPractice',
    key,
    keySignature: key.keySignature,
    slotCount: 3,
    lines: [
      {
        clef: 'treble',
        notes: [
          makeStaffNote('treble-0', 'C', 0, 1, 'treble', 0, 4, 1),
          makeStaffNote('treble-1', 'D', 2, 2, 'treble', 1, 4, 2, ['activeChord']),
          makeStaffNote('treble-2', 'E', 4, 3, 'treble', 2, 4, 3)
        ]
      },
      {
        clef: 'bass',
        notes: [
          makeStaffNote('bass-0', 'C', 0, 1, 'bass', 0, 3, 5),
          makeStaffNote('bass-1', 'B', 11, 7, 'bass', 1, 2, 5),
          makeStaffNote('bass-2', 'A', 9, 6, 'bass', 2, 2, 4)
        ]
      }
    ]
  } as const;
}

function makeStaffNote(
  id: string,
  noteName: NoteName,
  physicalPitchClass: PhysicalPitchClass,
  degree: ScaleDegree,
  clef: StaffClef,
  slotIndex: number,
  octave: number,
  finger: PianoFinger | null,
  highlightLayers: readonly StaffHighlightLayer[] = []
): StaffNoteViewModel {
  return {
    id,
    noteName,
    degree,
    degreeLabel: degree === 6 ? '6' : degree === 7 ? '7' : `${degree}`,
    physicalPitchClass,
    octave,
    clef,
    slotIndex,
    highlightLayers,
    finger
  };
}

function makeKey(
  displayName: KeyDefinition['displayName'],
  mode: Mode,
  tonic: NoteName,
  physicalPitchClass: PhysicalPitchClass,
  keySignature: KeySignature
): KeyDefinition {
  return {
    id: displayName,
    tonic,
    mode,
    physicalPitchClass,
    keySignature,
    signsCount: keySignature.count,
    difficulty: 'easy',
    recommended: true,
    displayName
  };
}

const cMajor = makeKey('C Major', 'major', 'C', 0, {
  accidental: 'natural',
  count: 0,
  notes: []
});
const fMajor = makeKey('F Major', 'major', 'F', 5, {
  accidental: 'flat',
  count: 1,
  notes: ['B']
});
