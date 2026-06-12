import type { ScaleSummary } from '../../state/selectors';
import type {
  ScaleFingering,
  ScaleFingeringDirection,
  ScaleFingeringHand,
  TheoryOverlayContextTarget
} from '../../music/types';

export interface ScaleStripProps {
  readonly scaleSummary: ScaleSummary;
  readonly onOpenTheory: (target: TheoryOverlayContextTarget) => void;
  readonly className?: string;
}

/** Полоса нот гаммы со ступенями; на десктопе плавает под клавиатурой по центру. */
export function ScaleStrip({ scaleSummary, onOpenTheory, className }: ScaleStripProps) {
  const fingering = scaleSummary.scaleFingering;
  const label = fingering === null ? 'Ноты гаммы' : 'Ноты гаммы и аппликатура';
  const chips =
    fingering === null
      ? scaleSummary.notes.map((note, index) => ({
          id: note.name,
          noteName: note.name,
          degreeLabel: scaleSummary.degreeLabels[index],
          finger: null,
          tonic: index === 0
        }))
      : fingering.steps.map((step) => ({
          id: `${step.stepIndex}-${step.scaleNote.name}`,
          noteName: step.scaleNote.name,
          degreeLabel: scaleSummary.degreeLabels[step.scaleNote.degree - 1],
          finger: step.finger,
          tonic: step.scaleNote.degree === 1
        }));

  return (
    <div
      className="hud-scale-stack"
      data-fingering={fingering === null ? 'false' : 'true'}
      aria-label={label}
    >
      <div
        className={className === undefined ? 'hud-scale-strip' : `hud-scale-strip ${className}`}
        data-fingering={fingering === null ? 'false' : 'true'}
      >
        {chips.map((chip) => (
          <span
            key={chip.id}
            className="hud-scale-chip"
            data-tonic={chip.tonic ? 'true' : 'false'}
            aria-label={
              chip.finger === null
                ? `${chip.noteName}, ступень ${chip.degreeLabel}`
                : `${chip.noteName}, ступень ${chip.degreeLabel}, палец ${chip.finger}`
            }
          >
            <span className="hud-scale-chip__note">{chip.noteName}</span>
            <span className="hud-scale-chip__meta">
              <span className="hud-scale-chip__degree">{chip.degreeLabel}</span>
              {chip.finger === null ? null : (
                <span className="hud-scale-chip__finger">{chip.finger}</span>
              )}
            </span>
          </span>
        ))}
        <button
          className="hud-info-button"
          type="button"
          aria-label="Подробнее о гамме"
          onClick={() => onOpenTheory('scale')}
        >
          i
        </button>
      </div>
      {fingering === null ? null : (
        <p className="hud-scale-fingering-hint">{formatFingeringHint(fingering)}</p>
      )}
    </div>
  );
}

function formatFingeringHint(fingering: ScaleFingering): string {
  return `${formatFingeringHand(fingering.hand)} ${formatFingeringDirection(
    fingering.direction
  )}: ${fingering.patternLabel}`;
}

function formatFingeringHand(hand: ScaleFingeringHand): string {
  return hand === 'right' ? 'Правая' : 'Левая';
}

function formatFingeringDirection(direction: ScaleFingeringDirection): string {
  return direction === 'ascending' ? 'вверх' : 'вниз';
}
