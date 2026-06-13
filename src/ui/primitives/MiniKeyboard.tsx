import './primitives.css';
import type { MiniKeyboardKeyViewModel } from '../../state/selectors';
import type { CSSProperties } from 'react';

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
            style={getKeyStyle(key, keys)}
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

const BLACK_KEY_WIDTH_PERCENT = 11;

function getKeyStyle(
  key: MiniKeyboardKeyViewModel,
  keys: readonly MiniKeyboardKeyViewModel[]
): CSSProperties | undefined {
  if (!key.isBlackKey) {
    return undefined;
  }

  const previousWhitePitchClass = previousPitchClass(key.physicalPitchClass);
  const whiteKeys = keys.filter((candidate) => candidate.isWhiteKey);
  const previousWhiteIndex = whiteKeys.findIndex(
    (candidate) => candidate.physicalPitchClass === previousWhitePitchClass
  );

  if (previousWhiteIndex < 0) {
    return undefined;
  }

  const leftPercent =
    ((previousWhiteIndex + 1) / whiteKeys.length) * 100 - BLACK_KEY_WIDTH_PERCENT / 2;

  return { left: `${leftPercent}%` };
}

function previousPitchClass(
  physicalPitchClass: MiniKeyboardKeyViewModel['physicalPitchClass']
): MiniKeyboardKeyViewModel['physicalPitchClass'] {
  return ((physicalPitchClass + 11) % 12) as MiniKeyboardKeyViewModel['physicalPitchClass'];
}

function formatKeyAriaLabel(key: MiniKeyboardKeyViewModel): string {
  const name = key.noteLabel ?? `pitch class ${key.physicalPitchClass}`;

  return key.active ? `${name}, нота аккорда` : `${name}, вне аккорда`;
}

function joinClassNames(...classNames: readonly (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}
