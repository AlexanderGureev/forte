import type { ScaleSummary } from '../../state/selectors';
import type { TheoryOverlayContextTarget } from '../../music/types';

export interface ScaleStripProps {
  readonly scaleSummary: ScaleSummary;
  readonly onOpenTheory: (target: TheoryOverlayContextTarget) => void;
  readonly className?: string;
}

/** Полоса нот гаммы со ступенями; на десктопе плавает под клавиатурой по центру. */
export function ScaleStrip({ scaleSummary, onOpenTheory, className }: ScaleStripProps) {
  return (
    <div
      className={className === undefined ? 'hud-scale-strip' : `hud-scale-strip ${className}`}
      aria-label="Ноты гаммы"
    >
      {scaleSummary.notes.map((note, index) => (
        <span
          key={note.name}
          className="hud-scale-chip"
          data-tonic={index === 0 ? 'true' : 'false'}
        >
          <span className="hud-scale-chip__note">{note.name}</span>
          <span className="hud-scale-chip__degree">{scaleSummary.degreeLabels[index]}</span>
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
  );
}
