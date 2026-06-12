import { KeySelector, type SupportedKeyViewModel } from '../primitives';
import type { RecommendedKeyViewModel } from '../../state/selectors';
import type { KeyDefinition, TheoryOverlayContextTarget } from '../../music/types';

export interface RecommendedKeysProps {
  readonly recommendedKeys: readonly RecommendedKeyViewModel[];
  readonly supportedKeys: readonly SupportedKeyViewModel[];
  readonly onSelectKey: (key: KeyDefinition) => void;
  readonly onOpenTheory: (target: TheoryOverlayContextTarget) => void;
  readonly onCollapse?: () => void;
}

export function RecommendedKeys({
  recommendedKeys,
  supportedKeys,
  onSelectKey,
  onOpenTheory,
  onCollapse
}: RecommendedKeysProps) {
  return (
    <section className="hud-keys hud-panel" aria-label="Выбор тональности">
      <div className="hud-panel__header">
        <span className="hud-eyebrow">Тональность</span>
        <span className="hud-panel__header-actions">
          <button
            className="hud-info-button"
            type="button"
            aria-label="Подробнее о тональностях"
            onClick={() => onOpenTheory('key')}
          >
            i
          </button>
          {onCollapse !== undefined ? (
            <button
              className="hud-info-button hud-collapse-button"
              type="button"
              aria-label="Свернуть панель тональностей"
              data-direction="left"
              onClick={onCollapse}
            />
          ) : null}
        </span>
      </div>
      <KeySelector
        recommendedKeys={recommendedKeys}
        supportedKeys={supportedKeys}
        onSelectKey={onSelectKey}
        className="hud-keys__selector"
      />
    </section>
  );
}
