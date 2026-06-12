import { ChordCard } from '../primitives';
import type { ChordCardViewModel } from '../../state/selectors';
import type { ScaleDegree, TheoryOverlayContextTarget } from '../../music/types';

export interface ChordPanelProps {
  readonly chords: readonly ChordCardViewModel[];
  readonly onSelectChord: (degree: ScaleDegree) => void;
  readonly chordLayerEnabled: boolean;
  readonly onOpenTheory: (target: TheoryOverlayContextTarget) => void;
  readonly onCollapse?: () => void;
}

export function ChordPanel({
  chords,
  onSelectChord,
  chordLayerEnabled,
  onOpenTheory,
  onCollapse
}: ChordPanelProps) {
  return (
    <section className="hud-chord-panel hud-panel" aria-label="Диатонические аккорды">
      <div className="hud-panel__header">
        <span className="hud-eyebrow">7 аккордов лада</span>
        <span className="hud-panel__header-actions">
          <button
            className="hud-info-button"
            type="button"
            aria-label="Подробнее о диатонических аккордах"
            onClick={() => onOpenTheory('chords')}
          >
            i
          </button>
          {onCollapse !== undefined ? (
            <button
              className="hud-info-button hud-collapse-button"
              type="button"
              aria-label="Свернуть панель аккордов"
              data-direction="right"
              onClick={onCollapse}
            />
          ) : null}
        </span>
      </div>
      {!chordLayerEnabled ? (
        <p className="hud-chord-panel__note">Подсветка аккорда скрыта режимом «Только гамма».</p>
      ) : null}
      <div className="hud-chord-panel__list">
        {chords.map((chord) => (
          <ChordCard key={chord.degree} chord={chord} onSelect={onSelectChord} />
        ))}
      </div>
    </section>
  );
}
