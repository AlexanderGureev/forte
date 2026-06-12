import './primitives.css';
import { MiniKeyboard } from './MiniKeyboard';
import type { ProgressionCardViewModel } from '../../state/selectors';

export interface ProgressionCardProps {
  readonly card: ProgressionCardViewModel;
  readonly onSelectStep?: (stepIndex: number) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function ProgressionCard({
  card,
  onSelectStep,
  disabled = false,
  className
}: ProgressionCardProps) {
  const stepNumber = card.stepIndex + 1;

  return (
    <article
      className={joinClassNames(
        'primitive-progression-card',
        card.active && 'primitive-progression-card--active',
        className
      )}
      data-active={card.active ? 'true' : 'false'}
    >
      <button
        className="primitive-progression-card__button"
        type="button"
        aria-pressed={card.active}
        aria-label={`Выбрать шаг ${stepNumber}: ${card.chordName}, ступень ${card.romanDegree}`}
        disabled={disabled}
        onClick={() => onSelectStep?.(card.stepIndex)}
      >
        <span className="primitive-progression-card__step">{stepNumber}</span>
        <span className="primitive-progression-card__body">
          <span className="primitive-progression-card__name">{card.chordName}</span>
          <span className="primitive-progression-card__degree">{card.romanDegree}</span>
        </span>
      </button>
      <MiniKeyboard
        keys={card.miniKeyboardKeys}
        ariaLabel={`Мини-клавиатура шага ${stepNumber}`}
        className="primitive-progression-card__keyboard"
      />
    </article>
  );
}

function joinClassNames(...classNames: readonly (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}
