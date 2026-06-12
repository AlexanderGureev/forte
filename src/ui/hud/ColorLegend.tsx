import type { ColorLegendItem, TheoryOverlayContextTarget } from '../../music/types';

export interface ColorLegendProps {
  readonly items: readonly ColorLegendItem[];
  readonly onOpenTheory: (target: TheoryOverlayContextTarget) => void;
}

export function ColorLegend({ items, onOpenTheory }: ColorLegendProps) {
  return (
    <section className="hud-legend" aria-label="Легенда подсветки клавиш">
      <div className="hud-panel__header">
        <span className="hud-eyebrow">Подсветка</span>
        <button
          className="hud-info-button"
          type="button"
          aria-label="Подробнее о легенде цветов"
          onClick={() => onOpenTheory('colorLegend')}
        >
          i
        </button>
      </div>
      <ul className="hud-legend__list">
        {items.map((item) => (
          <li key={item.id} className="hud-legend__item">
            <span className="hud-legend__swatch" data-kind={item.id} aria-hidden="true" />
            <span className="hud-legend__label">{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
