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
  const handleSelectStep = () => {
    if (disabled) {
      return;
    }

    onSelectStep?.(card.stepIndex);
  };

  return (
    <article
      className={joinClassNames(
        'primitive-progression-card',
        card.active && 'primitive-progression-card--active',
        disabled && 'primitive-progression-card--disabled',
        className
      )}
      data-active={card.active ? 'true' : 'false'}
      data-disabled={disabled ? 'true' : 'false'}
      onClick={handleSelectStep}
    >
      <button
        className="primitive-progression-card__button"
        type="button"
        aria-pressed={card.active}
        aria-label={`Выбрать шаг ${stepNumber}: ${card.chordName}, ступень ${card.romanDegree}`}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          handleSelectStep();
        }}
      />
      <div className="primitive-progression-card__content">
        <div className="primitive-progression-card__summary">
          <span className="primitive-progression-card__step">{stepNumber}</span>
          <span className="primitive-progression-card__body">
            <span className="primitive-progression-card__name">{card.chordName}</span>
            <span className="primitive-progression-card__degree">{card.romanDegree}</span>
          </span>
        </div>
        <MiniKeyboard
          keys={card.miniKeyboardKeys}
          ariaLabel={`Мини-клавиатура шага ${stepNumber}`}
          className="primitive-progression-card__keyboard"
        />
      </div>
    </article>
  );
}

function joinClassNames(...classNames: readonly (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}
