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
  StaffClef,
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

function makeModel(key: KeyDefinition) {
  return {
    mode: 'staffPractice',
    key,
    keySignature: key.keySignature,
    slotCount: 3,
    lines: [
      {
        clef: 'treble',
        notes: [
          makeStaffNote('treble-0', 'C', 0, 1, 'treble', 0, 4, false, 1),
          makeStaffNote('treble-1', 'D', 2, 2, 'treble', 1, 4, true, 2),
          makeStaffNote('treble-2', 'E', 4, 3, 'treble', 2, 4, false, 3)
        ]
      },
      {
        clef: 'bass',
        notes: [
          makeStaffNote('bass-0', 'C', 0, 1, 'bass', 0, 3, false, 5),
          makeStaffNote('bass-1', 'B', 11, 7, 'bass', 1, 2, false, 5),
          makeStaffNote('bass-2', 'A', 9, 6, 'bass', 2, 2, false, 4)
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
  highlighted: boolean,
  finger: PianoFinger | null
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
    highlighted,
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
