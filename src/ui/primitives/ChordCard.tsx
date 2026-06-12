import './primitives.css';
import type { ChordCardViewModel } from '../../state/selectors';

export interface ChordCardProps {
  readonly chord: ChordCardViewModel;
  readonly onSelect?: (degree: ChordCardViewModel['degree']) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function ChordCard({ chord, onSelect, disabled = false, className }: ChordCardProps) {
  const marker = chord.tense || chord.quality === 'diminished' ? 'dim' : null;

  return (
    <button
      className={joinClassNames(
        'primitive-chord-card',
        chord.selected && 'primitive-chord-card--selected',
        chord.inCurrentProgression && 'primitive-chord-card--in-progression',
        marker !== null && 'primitive-chord-card--tense',
        className
      )}
      type="button"
      aria-pressed={chord.selected}
      aria-label={`Выбрать аккорд ${chord.chordName}, ступень ${chord.romanDegree}`}
      disabled={disabled}
      data-quality={chord.quality}
      onClick={() => onSelect?.(chord.degree)}
    >
      <span className="primitive-chord-card__degree">{chord.romanDegree}</span>
      <span className="primitive-chord-card__body">
        <span className="primitive-chord-card__name">{chord.chordName}</span>
        <span className="primitive-chord-card__notes">
          {chord.notes.map((note) => note.name).join(' - ')}
        </span>
      </span>
      {marker !== null ? (
        <span className="primitive-chord-card__marker" aria-label="Напряженный diminished">
          {marker}
        </span>
      ) : null}
    </button>
  );
}

function joinClassNames(...classNames: readonly (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}
