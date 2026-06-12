import { useEffect, useRef, useState } from 'react';
import { SegmentedControl } from '../primitives';
import { ColorLegend } from './ColorLegend';
import { LabelModeControl } from './LabelModeControl';
import { ScaleFingeringControl } from './ScaleFingeringControl';
import type { ScaleSummary } from '../../state/selectors';
import type {
  ColorLegendItem,
  LabelMode,
  Mode,
  ScaleFingeringDirection,
  ScaleFingeringHand,
  TheoryOverlayContextTarget
} from '../../music/types';

export interface TopHudProps {
  readonly scaleSummary: ScaleSummary;
  readonly mode: Mode;
  readonly onSelectMode: (mode: Mode) => void;
  readonly labelMode: LabelMode;
  readonly onSelectLabelMode: (labelMode: LabelMode) => void;
  readonly labelsVisible: boolean;
  readonly onToggleLabels: () => void;
  readonly chordLayerEnabled: boolean;
  readonly onToggleChordLayer: () => void;
  readonly scaleFingeringEnabled: boolean;
  readonly scaleFingeringHand: ScaleFingeringHand;
  readonly scaleFingeringDirection: ScaleFingeringDirection;
  readonly onToggleScaleFingering: () => void;
  readonly onSelectScaleFingeringHand: (hand: ScaleFingeringHand) => void;
  readonly onSelectScaleFingeringDirection: (direction: ScaleFingeringDirection) => void;
  readonly focusMode: boolean;
  readonly onToggleFocus: () => void;
  readonly onOpenTheory: (target: TheoryOverlayContextTarget) => void;
  readonly colorLegend: readonly ColorLegendItem[];
  readonly showSecondaryControls: boolean;
  readonly compact: boolean;
}

const DIFFICULTY_LABELS = {
  easy: 'легкая',
  medium: 'средняя',
  advanced: 'сложная'
} as const;

export function TopHud({
  scaleSummary,
  mode,
  onSelectMode,
  labelMode,
  onSelectLabelMode,
  labelsVisible,
  onToggleLabels,
  chordLayerEnabled,
  onToggleChordLayer,
  scaleFingeringEnabled,
  scaleFingeringHand,
  scaleFingeringDirection,
  onToggleScaleFingering,
  onSelectScaleFingeringHand,
  onSelectScaleFingeringDirection,
  focusMode,
  onToggleFocus,
  onOpenTheory,
  colorLegend,
  showSecondaryControls,
  compact
}: TopHudProps) {
  const { key } = scaleSummary;
  const signature =
    key.keySignature.count === 0
      ? '♮'
      : `${key.keySignature.count}${key.keySignature.accidental === 'sharp' ? '#' : 'b'}`;

  return (
    <header className="hud-top hud-panel" aria-label="Текущая тональность и режимы">
      <div className="hud-top__identity">
        <div className="hud-top__title-block">
          <p className="hud-eyebrow">Тональность</p>
          <div className="hud-top__title-row">
            <h1 className="hud-top__title">{key.displayName}</h1>
            <button
              className="hud-info-button"
              type="button"
              aria-label="Подробнее о тональности"
              onClick={() => onOpenTheory('key')}
            >
              i
            </button>
          </div>
          <p className="hud-top__meta">
            <span title="Знаки при ключе">{signature}</span>
            <span className="hud-top__meta-dot" aria-hidden="true" />
            <span data-difficulty={key.difficulty}>{DIFFICULTY_LABELS[key.difficulty]}</span>
            {/* Место зарезервировано всегда, чтобы шапка не прыгала при смене тональности */}
            <span
              className="hud-top__meta-flag"
              data-visible={key.recommended ? 'true' : 'false'}
              aria-hidden={key.recommended ? undefined : 'true'}
            >
              <span className="hud-top__meta-dot" aria-hidden="true" />
              <span className="hud-top__meta-gold">★ рекомендована</span>
            </span>
          </p>
        </div>
        <span className="hud-top__divider" aria-hidden="true" />
        <SegmentedControl
          label="Лад"
          value={mode}
          options={[
            { value: 'major', label: 'Major' },
            { value: 'naturalMinor', label: 'Minor', ariaLabel: 'Natural Minor' }
          ]}
          onChange={onSelectMode}
          className="hud-top__mode"
        />
      </div>

      {!compact ? (
        <div className="hud-top__controls">
          {showSecondaryControls ? (
            <ViewMenu
              chordLayerEnabled={chordLayerEnabled}
              onToggleChordLayer={onToggleChordLayer}
              scaleFingeringEnabled={scaleFingeringEnabled}
              scaleFingeringHand={scaleFingeringHand}
              scaleFingeringDirection={scaleFingeringDirection}
              onToggleScaleFingering={onToggleScaleFingering}
              onSelectScaleFingeringHand={onSelectScaleFingeringHand}
              onSelectScaleFingeringDirection={onSelectScaleFingeringDirection}
              labelsVisible={labelsVisible}
              labelMode={labelMode}
              onToggleLabels={onToggleLabels}
              onSelectLabelMode={onSelectLabelMode}
              colorLegend={colorLegend}
              onOpenTheory={onOpenTheory}
            />
          ) : null}
          <button
            className="hud-action"
            type="button"
            onClick={() => onOpenTheory('key')}
          >
            Теория
          </button>
          <button
            className="hud-action"
            type="button"
            aria-pressed={focusMode}
            data-active={focusMode ? 'true' : 'false'}
            onClick={onToggleFocus}
          >
            Фокус
          </button>
        </div>
      ) : null}
    </header>
  );
}

interface ViewMenuProps {
  readonly chordLayerEnabled: boolean;
  readonly onToggleChordLayer: () => void;
  readonly scaleFingeringEnabled: boolean;
  readonly scaleFingeringHand: ScaleFingeringHand;
  readonly scaleFingeringDirection: ScaleFingeringDirection;
  readonly onToggleScaleFingering: () => void;
  readonly onSelectScaleFingeringHand: (hand: ScaleFingeringHand) => void;
  readonly onSelectScaleFingeringDirection: (direction: ScaleFingeringDirection) => void;
  readonly labelsVisible: boolean;
  readonly labelMode: LabelMode;
  readonly onToggleLabels: () => void;
  readonly onSelectLabelMode: (labelMode: LabelMode) => void;
  readonly colorLegend: readonly ColorLegendItem[];
  readonly onOpenTheory: (target: TheoryOverlayContextTarget) => void;
}

/** Все настройки отображения собраны в одном меню, чтобы не перегружать шапку. */
function ViewMenu({
  chordLayerEnabled,
  onToggleChordLayer,
  scaleFingeringEnabled,
  scaleFingeringHand,
  scaleFingeringDirection,
  onToggleScaleFingering,
  onSelectScaleFingeringHand,
  onSelectScaleFingeringDirection,
  labelsVisible,
  labelMode,
  onToggleLabels,
  onSelectLabelMode,
  colorLegend,
  onOpenTheory
}: ViewMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current !== null &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="hud-view-menu" ref={containerRef}>
      <button
        className="hud-action"
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        data-active={open ? 'true' : 'false'}
        onClick={() => setOpen((value) => !value)}
      >
        Вид
      </button>
      {open ? (
        <div className="hud-view-menu__popover hud-panel" role="group" aria-label="Настройки вида">
          <div className="hud-view-menu__row">
            <span className="hud-view-menu__label">Подписи клавиш</span>
            <LabelModeControl
              labelsVisible={labelsVisible}
              labelMode={labelMode}
              onToggleLabels={onToggleLabels}
              onSelectLabelMode={onSelectLabelMode}
            />
          </div>
          <div className="hud-view-menu__row">
            <span className="hud-view-menu__label">Слой аккорда</span>
            <button
              className="hud-toggle"
              type="button"
              aria-pressed={!chordLayerEnabled}
              onClick={onToggleChordLayer}
            >
              Только гамма
            </button>
          </div>
          <div className="hud-view-menu__row">
            <span className="hud-view-menu__label">Аппликатура гаммы</span>
            <ScaleFingeringControl
              enabled={scaleFingeringEnabled}
              hand={scaleFingeringHand}
              direction={scaleFingeringDirection}
              onToggleEnabled={onToggleScaleFingering}
              onSelectHand={onSelectScaleFingeringHand}
              onSelectDirection={onSelectScaleFingeringDirection}
            />
          </div>
          <span className="hud-view-menu__divider" aria-hidden="true" />
          <ColorLegend items={colorLegend} onOpenTheory={onOpenTheory} />
        </div>
      ) : null}
    </div>
  );
}
