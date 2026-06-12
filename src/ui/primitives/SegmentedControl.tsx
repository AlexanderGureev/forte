import { useId } from 'react';
import './primitives.css';

export interface SegmentedControlOption<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
  readonly ariaLabel?: string;
  readonly disabled?: boolean;
}

export interface SegmentedControlProps<TValue extends string> {
  readonly label: string;
  readonly value: TValue;
  readonly options: readonly SegmentedControlOption<TValue>[];
  readonly onChange?: (value: TValue) => void;
  readonly className?: string;
  readonly disabled?: boolean;
}

export function SegmentedControl<TValue extends string>({
  label,
  value,
  options,
  onChange,
  className,
  disabled = false
}: SegmentedControlProps<TValue>) {
  const labelId = useId();

  return (
    <div className={joinClassNames('primitive-segmented-control', className)}>
      <span id={labelId} className="primitive-segmented-control__label">
        {label}
      </span>
      <div className="primitive-segmented-control__options" role="group" aria-labelledby={labelId}>
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              className={joinClassNames(
                'primitive-segmented-control__option',
                selected && 'primitive-segmented-control__option--selected'
              )}
              type="button"
              aria-pressed={selected}
              aria-label={option.ariaLabel ?? option.label}
              disabled={disabled || option.disabled}
              onClick={() => {
                if (!selected) {
                  onChange?.(option.value);
                }
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function joinClassNames(...classNames: readonly (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}
