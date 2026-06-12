import { useEffect, useRef } from 'react';
import './primitives.css';
import type { TheoryOverlayContextTarget, TheoryOverlayModel } from '../../music/types';

export interface TheoryOverlayProps {
  readonly model: TheoryOverlayModel;
  readonly onClose: () => void;
  readonly className?: string;
}

export function TheoryOverlay({ model, onClose, className }: TheoryOverlayProps) {
  const sectionsRef = useRef<HTMLDivElement>(null);

  // Прокручиваем к секции, ради которой открыли справку, — она может быть внизу списка.
  useEffect(() => {
    if (!model.isOpen || model.contextTarget === null) {
      return;
    }

    const highlighted = sectionsRef.current?.querySelector('[data-highlighted="true"]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    highlighted?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [model.isOpen, model.contextTarget]);

  if (!model.isOpen) {
    return null;
  }

  return (
    <aside
      className={joinClassNames('primitive-theory-overlay', className)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="primitive-theory-overlay-title"
      data-context-target={model.contextTarget ?? 'none'}
    >
      <header className="primitive-theory-overlay__header">
        <div>
          <p className="primitive-theory-overlay__eyebrow">Теория</p>
          <h2 id="primitive-theory-overlay-title" className="primitive-theory-overlay__title">
            {model.key.displayName}
          </h2>
          {model.contextTarget !== null ? (
            <p className="primitive-theory-overlay__context">
              Контекст: {formatContextTarget(model.contextTarget)}
            </p>
          ) : null}
        </div>
        <button
          className="primitive-theory-overlay__close"
          type="button"
          aria-label="Закрыть теорию"
          onClick={onClose}
        >
          Закрыть
        </button>
      </header>

      <div ref={sectionsRef} className="primitive-theory-overlay__sections">
        {model.sections.map((section) => (
          <section
            key={section.id}
            className={joinClassNames(
              'primitive-theory-overlay__section',
              section.highlighted && 'primitive-theory-overlay__section--highlighted'
            )}
            data-section-id={section.id}
            data-highlighted={section.highlighted ? 'true' : 'false'}
            aria-label={section.title}
          >
            <h3 className="primitive-theory-overlay__section-title">{section.title}</h3>
            {section.rows.length > 0 ? (
              <dl className="primitive-theory-overlay__rows">
                {section.rows.map((row) => (
                  <div key={`${section.id}-${row.label}`} className="primitive-theory-overlay__row">
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {section.items.length > 0 ? (
              <ul className="primitive-theory-overlay__items">
                {section.items.map((item) => (
                  <li key={`${section.id}-${item}`}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </aside>
  );
}

function formatContextTarget(contextTarget: TheoryOverlayContextTarget): string {
  const labels = {
    key: 'тональность',
    scale: 'гамма',
    chords: 'аккорды',
    progression: 'прогрессия',
    activeChord: 'активный аккорд',
    keyboard: 'клавиатура',
    colorLegend: 'легенда цветов'
  } satisfies Record<TheoryOverlayContextTarget, string>;

  return labels[contextTarget];
}

function joinClassNames(...classNames: readonly (string | false | null | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}
