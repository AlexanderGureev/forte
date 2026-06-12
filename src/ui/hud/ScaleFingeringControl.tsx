import { SegmentedControl } from '../primitives';
import type { ScaleFingeringDirection, ScaleFingeringHand } from '../../music/types';

export interface ScaleFingeringControlProps {
  readonly enabled: boolean;
  readonly hand: ScaleFingeringHand;
  readonly direction: ScaleFingeringDirection;
  readonly onToggleEnabled: () => void;
  readonly onSelectHand: (hand: ScaleFingeringHand) => void;
  readonly onSelectDirection: (direction: ScaleFingeringDirection) => void;
}

export function ScaleFingeringControl({
  enabled,
  hand,
  direction,
  onToggleEnabled,
  onSelectHand,
  onSelectDirection
}: ScaleFingeringControlProps) {
  return (
    <div className="hud-fingering-control" data-enabled={enabled ? 'true' : 'false'}>
      <button
        className="hud-toggle"
        type="button"
        aria-pressed={enabled}
        onClick={onToggleEnabled}
      >
        Аппликатура
      </button>
      {enabled ? (
        <div className="hud-fingering-control__segments">
          <SegmentedControl<ScaleFingeringHand>
            label="Рука"
            value={hand}
            options={[
              { value: 'right', label: 'Правая' },
              { value: 'left', label: 'Левая' }
            ]}
            onChange={onSelectHand}
          />
          <SegmentedControl<ScaleFingeringDirection>
            label="Направление"
            value={direction}
            options={[
              { value: 'ascending', label: 'Вверх' },
              { value: 'descending', label: 'Вниз' }
            ]}
            onChange={onSelectDirection}
          />
        </div>
      ) : null}
    </div>
  );
}
