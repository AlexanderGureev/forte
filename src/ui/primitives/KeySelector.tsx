import { useId } from 'react';
import './primitives.css';
import type { RecommendedKeyViewModel } from '../../state/selectors';
import type { KeyDefinition } from '../../music/types';

export interface SupportedKeyViewModel {
  readonly key: KeyDefinition;
  readonly selected: boolean;
}

export interface KeySelectorProps {
  readonly recommendedKeys: readonly RecommendedKeyViewModel[];
  readonly supportedKeys: readonly SupportedKeyViewModel[];
  readonly onSelectKey?: (key: KeyDefinition) => void;
  readonly className?: string;
  readonly disabled?: boolean;
}

export function KeySelector({
  recommendedKeys,
  supportedKeys,
  onSelectKey,
  className,
  disabled = false
}: KeySelectorProps) {
  const titleId = useId();
  const selectId = useId();
  const selectedSupportedKey = supportedKeys.find((option) => option.selected);

  return (
    <section
      className={joinClassNames('primitive-key-selector', className)}
      aria-labelledby={titleId}
    >
      <div className="primitive-key-selector__header">
        <span id={titleId} className="primitive-key-selector__title">
          Тональность
        </span>
        <label className="primitive-key-selector__select-label" htmlFor={selectId}>
          Все тональности
        </label>
      </div>

      <div className="primitive-key-selector__recommended" aria-label="Рекомендованные тональности">
        {recommendedKeys.map((option) => (
          <button
            key={option.key.id}
            className={joinClassNames(
              'primitive-key-selector__recommended-key',
              option.selected && 'primitive-key-selector__recommended-key--selected'
            )}
            type="button"
            aria-pressed={option.selected}
            aria-label={`Выбрать тональность ${option.key.displayName}`}
            disabled={disabled}
            onClick={() => onSelectKey?.(option.key)}
          >
            <span>{option.key.displayName}</span>
            {option.sameMode ? (
              <span className="primitive-key-selector__same-mode">тот же лад</span>
            ) : null}
          </button>
        ))}
      </div>

      <select
        id={selectId}
        className="primitive-key-selector__select"
        value={selectedSupportedKey?.key.id ?? ''}
        aria-label="Все тональности"
        disabled={disabled}
        onChange={(event) => {
          const selected = supportedKeys.find((option) => option.key.id === event.target.value);

          if (selected !== undefined) {
            onSelectKey?.(selected.key);
          }
        }}
      >
        {selectedSupportedKey === undefined ? (
          <option value="" disabled>
            Выберите тональность
          </option>
        ) : null}
        {supportedKeys.map((option) => (
          <option key={option.key.id} value={option.key.id}>
            {option.key.displayName}
          </option>
        ))}
      </select>
    </section>
  );
}

function joinClassNames(...classNames: readonly (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}
