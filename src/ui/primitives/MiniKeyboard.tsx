import './primitives.css';
import type { MiniKeyboardKeyViewModel } from '../../state/selectors';

export interface MiniKeyboardProps {
  readonly keys: readonly MiniKeyboardKeyViewModel[];
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly showInactiveLabels?: boolean;
}

export function MiniKeyboard({
  keys,
  ariaLabel = 'Мини-клавиатура аккорда',
  className,
  showInactiveLabels = false
}: MiniKeyboardProps) {
  const activeLabels = keys
    .filter((key) => key.active && key.noteLabel !== null)
    .map((key) => key.noteLabel)
    .join(', ');
  const description =
    activeLabels.length > 0
      ? `${ariaLabel}: ноты аккорда ${activeLabels}`
      : `${ariaLabel}: нет активных нот`;

  return (
    <div
      className={joinClassNames('primitive-mini-keyboard', className)}
      role="img"
      aria-label={description}
    >
      <div className="primitive-mini-keyboard__rail" role="list">
        {keys.map((key) => (
          <span
            key={key.id}
            className={joinClassNames(
              'primitive-mini-keyboard__key',
              key.isWhiteKey && 'primitive-mini-keyboard__key--white',
              key.isBlackKey && 'primitive-mini-keyboard__key--black',
              key.active && 'primitive-mini-keyboard__key--active'
            )}
            role="listitem"
            data-pitch-class={key.physicalPitchClass}
            data-active={key.active ? 'true' : 'false'}
            aria-label={formatKeyAriaLabel(key)}
          >
            {(key.active || showInactiveLabels) && key.noteLabel !== null ? (
              <span className="primitive-mini-keyboard__label">{key.noteLabel}</span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatKeyAriaLabel(key: MiniKeyboardKeyViewModel): string {
  const name = key.noteLabel ?? `pitch class ${key.physicalPitchClass}`;

  return key.active ? `${name}, нота аккорда` : `${name}, вне аккорда`;
}

function joinClassNames(...classNames: readonly (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}
