import { SegmentedControl } from '../primitives';
import type { ScaleFingeringDirection, ScaleFingeringHand } from '../../music/types';

export interface ScaleFingeringControlProps {
  readonly enabled: boolean;
  readonly hand: ScaleFingeringHand;
  readonly direction: ScaleFingeringDirection;
  /** На нотном стане аппликатура фиксирована (правая вверх, левая вниз),
      поэтому в staff-режимах выбор руки и направления заблокирован. */
  readonly handDirectionEnabled: boolean;
  readonly onToggleEnabled: () => void;
  readonly onSelectHand: (hand: ScaleFingeringHand) => void;
  readonly onSelectDirection: (direction: ScaleFingeringDirection) => void;
}

export function ScaleFingeringControl({
  enabled,
  hand,
  direction,
  handDirectionEnabled,
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
        <div
          className="hud-fingering-control__segments"
          title={
            handDirectionEnabled
              ? undefined
              : 'На нотном стане аппликатура фиксирована: правая рука вверх, левая вниз'
          }
        >
          <SegmentedControl<ScaleFingeringHand>
            label="Рука"
            value={hand}
            options={[
              { value: 'right', label: 'Правая' },
              { value: 'left', label: 'Левая' }
            ]}
            onChange={onSelectHand}
            disabled={!handDirectionEnabled}
          />
          <SegmentedControl<ScaleFingeringDirection>
            label="Направление"
            value={direction}
            options={[
              { value: 'ascending', label: 'Вверх' },
              { value: 'descending', label: 'Вниз' }
            ]}
            onChange={onSelectDirection}
            disabled={!handDirectionEnabled}
          />
        </div>
      ) : null}
    </div>
  );
}
