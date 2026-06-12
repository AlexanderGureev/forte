import { ProgressionCard } from '../primitives';
import type { ActiveChordStatus, ProgressionCardViewModel } from '../../state/selectors';
import type { ProgressionId, ProgressionPreset, TheoryOverlayContextTarget } from '../../music/types';

export interface ProgressionHudProps {
  readonly presets: readonly ProgressionPreset[];
  readonly selectedProgressionId: ProgressionId;
  readonly onSelectPreset: (progressionId: ProgressionId) => void;
  readonly cards: readonly ProgressionCardViewModel[];
  readonly onSelectStep: (stepIndex: number) => void;
  readonly status: ActiveChordStatus;
  readonly onOpenTheory: (target: TheoryOverlayContextTarget) => void;
}

export function ProgressionHud({
  presets,
  selectedProgressionId,
  onSelectPreset,
  cards,
  onSelectStep,
  status,
  onOpenTheory
}: ProgressionHudProps) {
  const statusText =
    status.source === 'progression'
      ? `Шаг ${(status.stepIndex ?? 0) + 1} · ${status.chordName} (${status.romanDegree})`
      : `Свой аккорд · ${status.chordName} (${status.romanDegree})`;

  return (
    <section className="hud-progression" aria-label="Прогрессия аккордов">
      <div className="hud-progression__header hud-panel">
        <span className="hud-eyebrow">Прогрессия</span>
        <div className="hud-progression__presets" role="group" aria-label="Пресеты прогрессий">
          {presets.map((preset) => (
            <button
              key={preset.id}
              className="hud-preset"
              type="button"
              aria-pressed={preset.id === selectedProgressionId}
              onClick={() => onSelectPreset(preset.id)}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <span className="hud-progression__status-group">
          <span className="hud-progression__status" data-source={status.source}>
            {statusText}
          </span>
          <button
            className="hud-info-button"
            type="button"
            aria-label="Подробнее об активном аккорде"
            onClick={() => onOpenTheory('activeChord')}
          >
            i
          </button>
        </span>
      </div>

      <div className="hud-progression__cards">
        {cards.map((card) => (
          <ProgressionCard key={card.id} card={card} onSelectStep={onSelectStep} />
        ))}
      </div>
    </section>
  );
}
