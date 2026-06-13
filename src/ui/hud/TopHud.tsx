import { useEffect, useRef, useState } from 'react';
import { SegmentedControl } from '../primitives';
import { ColorLegend } from './ColorLegend';
import { LabelModeControl } from './LabelModeControl';
import { MidiPanel, type MidiPanelProps } from './MidiPanel';
import { ScaleFingeringControl } from './ScaleFingeringControl';
import type { ScaleSummary } from '../../state/selectors';
import {
  adjustCameraZoom,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_MIN,
  CAMERA_ZOOM_STEP,
  DEFAULT_CAMERA_ZOOM,
  formatCameraZoomPercent
} from '../../state/view-settings';
import type {
  ColorLegendItem,
  LabelMode,
  Mode,
  ScaleDisplayMode,
  ScaleFingeringDirection,
  ScaleFingeringHand,
  TheoryOverlayContextTarget
} from '../../music/types';

const DIFFICULTY_LABELS = {
  easy: 'легкая',
  medium: 'средняя',
  advanced: 'сложная'
} as const;

const SCALE_DISPLAY_MODE_OPTIONS = [
  { value: 'strip', label: 'Плашка' },
  { value: 'staffImprovisation', label: 'Импровизация' },
  { value: 'staffPractice', label: 'Практика' }
] as const satisfies readonly {
  readonly value: ScaleDisplayMode;
  readonly label: string;
}[];

export interface KeyIdentityProps {
  readonly scaleSummary: ScaleSummary;
  readonly mode: Mode;
  readonly onSelectMode: (mode: Mode) => void;
  readonly onOpenTheory: (target: TheoryOverlayContextTarget) => void;
  readonly compact?: boolean;
}

/** Текущая тональность с переключателем лада: левый край верхней полосы. */
export function KeyIdentity({
  scaleSummary,
  mode,
  onSelectMode,
  onOpenTheory,
  compact = false
}: KeyIdentityProps) {
  const { key } = scaleSummary;
  const signature =
    key.keySignature.count === 0
      ? '♮'
      : `${key.keySignature.count}${key.keySignature.accidental === 'sharp' ? '#' : 'b'}`;

  return (
    <section
      className={`hud-identity hud-panel${compact ? ' hud-identity--compact' : ''}`}
      aria-label="Текущая тональность"
    >
      <div className="hud-identity__title-row">
        <h1 className="hud-identity__title">{key.displayName}</h1>
        <button
          className="hud-info-button"
          type="button"
          aria-label="Подробнее о тональности"
          onClick={() => onOpenTheory('key')}
        >
          i
        </button>
      </div>
      <p className="hud-identity__meta">
        <span title="Знаки при ключе">{signature}</span>
        <span className="hud-identity__meta-dot" aria-hidden="true" />
        <span data-difficulty={key.difficulty}>{DIFFICULTY_LABELS[key.difficulty]}</span>
        {/* Место зарезервировано всегда, чтобы блок не прыгал при смене тональности */}
        <span
          className="hud-identity__meta-flag"
          data-visible={key.recommended ? 'true' : 'false'}
          aria-hidden={key.recommended ? undefined : 'true'}
        >
          <span className="hud-identity__meta-dot" aria-hidden="true" />
          <span className="hud-identity__meta-gold">★ рекомендована</span>
        </span>
      </p>
      <SegmentedControl
        label="Лад"
        value={mode}
        options={[
          { value: 'major', label: 'Major' },
          { value: 'naturalMinor', label: 'Minor', ariaLabel: 'Natural Minor' }
        ]}
        onChange={onSelectMode}
        className="hud-identity__mode"
      />
    </section>
  );
}

export interface HudActionsProps {
  readonly showViewMenu: boolean;
  readonly chordLayerEnabled: boolean;
  readonly onToggleChordLayer: () => void;
  readonly chordEchoEnabled: boolean;
  readonly onToggleChordEcho: () => void;
  readonly scaleFingeringEnabled: boolean;
  readonly scaleFingeringHand: ScaleFingeringHand;
  readonly scaleFingeringDirection: ScaleFingeringDirection;
  readonly onToggleScaleFingering: () => void;
  readonly onSelectScaleFingeringHand: (hand: ScaleFingeringHand) => void;
  readonly onSelectScaleFingeringDirection: (direction: ScaleFingeringDirection) => void;
  readonly scaleDisplayMode: ScaleDisplayMode;
  readonly onSelectScaleDisplayMode: (mode: ScaleDisplayMode) => void;
  readonly labelsVisible: boolean;
  readonly labelMode: LabelMode;
  readonly onToggleLabels: () => void;
  readonly onSelectLabelMode: (labelMode: LabelMode) => void;
  readonly cameraZoom: number;
  readonly onChangeCameraZoom: (cameraZoom: number) => void;
  readonly onResetCameraZoom: () => void;
  readonly midiPanel: MidiPanelProps;
  readonly colorLegend: readonly ColorLegendItem[];
  readonly onOpenTheory: (target: TheoryOverlayContextTarget) => void;
  readonly focusMode: boolean;
  readonly onToggleFocus: () => void;
}

/** Кнопки действий HUD: правый край верхней полосы на десктопе. */
export function HudActions({
  showViewMenu,
  chordLayerEnabled,
  onToggleChordLayer,
  chordEchoEnabled,
  onToggleChordEcho,
  scaleFingeringEnabled,
  scaleFingeringHand,
  scaleFingeringDirection,
  onToggleScaleFingering,
  onSelectScaleFingeringHand,
  onSelectScaleFingeringDirection,
  scaleDisplayMode,
  onSelectScaleDisplayMode,
  labelsVisible,
  labelMode,
  onToggleLabels,
  onSelectLabelMode,
  cameraZoom,
  onChangeCameraZoom,
  onResetCameraZoom,
  midiPanel,
  colorLegend,
  onOpenTheory,
  focusMode,
  onToggleFocus
}: HudActionsProps) {
  return (
    <div className="hud-actions">
      {showViewMenu ? (
        <ViewMenu
          chordLayerEnabled={chordLayerEnabled}
          onToggleChordLayer={onToggleChordLayer}
          chordEchoEnabled={chordEchoEnabled}
          onToggleChordEcho={onToggleChordEcho}
          scaleFingeringEnabled={scaleFingeringEnabled}
          scaleFingeringHand={scaleFingeringHand}
          scaleFingeringDirection={scaleFingeringDirection}
          onToggleScaleFingering={onToggleScaleFingering}
          onSelectScaleFingeringHand={onSelectScaleFingeringHand}
          onSelectScaleFingeringDirection={onSelectScaleFingeringDirection}
          scaleDisplayMode={scaleDisplayMode}
          onSelectScaleDisplayMode={onSelectScaleDisplayMode}
          labelsVisible={labelsVisible}
          labelMode={labelMode}
          onToggleLabels={onToggleLabels}
          onSelectLabelMode={onSelectLabelMode}
          cameraZoom={cameraZoom}
          onChangeCameraZoom={onChangeCameraZoom}
          onResetCameraZoom={onResetCameraZoom}
          colorLegend={colorLegend}
          onOpenTheory={onOpenTheory}
        />
      ) : null}
      <MidiMenu {...midiPanel} />
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
  );
}

function MidiMenu(props: MidiPanelProps) {
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
    <div className="hud-midi-menu" ref={containerRef}>
      <button
        className="hud-action"
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        data-active={open ? 'true' : 'false'}
        onClick={() => setOpen((value) => !value)}
      >
        MIDI
      </button>
      {open ? (
        <div className="hud-midi-menu__popover hud-panel" role="dialog" aria-label="MIDI">
          <MidiPanel {...props} />
        </div>
      ) : null}
    </div>
  );
}

interface ScaleDisplayModeControlProps {
  readonly scaleDisplayMode: ScaleDisplayMode;
  readonly onSelectScaleDisplayMode: (mode: ScaleDisplayMode) => void;
}

export function ScaleDisplayModeControl({
  scaleDisplayMode,
  onSelectScaleDisplayMode
}: ScaleDisplayModeControlProps) {
  return (
    <SegmentedControl<ScaleDisplayMode>
      label="Вид гаммы"
      value={scaleDisplayMode}
      options={SCALE_DISPLAY_MODE_OPTIONS}
      onChange={onSelectScaleDisplayMode}
      className="hud-scale-display-control"
    />
  );
}

interface CameraZoomControlProps {
  readonly cameraZoom: number;
  readonly onChangeCameraZoom: (cameraZoom: number) => void;
  readonly onResetCameraZoom: () => void;
}

export function CameraZoomControl({
  cameraZoom,
  onChangeCameraZoom,
  onResetCameraZoom
}: CameraZoomControlProps) {
  const zoomPercent = formatCameraZoomPercent(cameraZoom);

  return (
    <div className="hud-camera-zoom" role="group" aria-label="Масштаб камеры">
      <button
        className="hud-action hud-camera-zoom__button"
        type="button"
        aria-label="Отдалить камеру"
        disabled={cameraZoom <= CAMERA_ZOOM_MIN}
        onClick={() => onChangeCameraZoom(adjustCameraZoom(cameraZoom, -1))}
      >
        -
      </button>
      <input
        className="hud-camera-zoom__slider"
        type="range"
        min={CAMERA_ZOOM_MIN}
        max={CAMERA_ZOOM_MAX}
        step={CAMERA_ZOOM_STEP}
        value={cameraZoom}
        aria-label="Масштаб камеры"
        onChange={(event) => onChangeCameraZoom(Number(event.currentTarget.value))}
      />
      <button
        className="hud-action hud-camera-zoom__button"
        type="button"
        aria-label="Приблизить камеру"
        disabled={cameraZoom >= CAMERA_ZOOM_MAX}
        onClick={() => onChangeCameraZoom(adjustCameraZoom(cameraZoom, 1))}
      >
        +
      </button>
      <button
        className="hud-action hud-camera-zoom__reset"
        type="button"
        aria-label="Сбросить масштаб камеры"
        disabled={cameraZoom === DEFAULT_CAMERA_ZOOM}
        onClick={onResetCameraZoom}
      >
        {zoomPercent}
      </button>
    </div>
  );
}

interface ViewMenuProps {
  readonly chordLayerEnabled: boolean;
  readonly onToggleChordLayer: () => void;
  readonly chordEchoEnabled: boolean;
  readonly onToggleChordEcho: () => void;
  readonly scaleFingeringEnabled: boolean;
  readonly scaleFingeringHand: ScaleFingeringHand;
  readonly scaleFingeringDirection: ScaleFingeringDirection;
  readonly onToggleScaleFingering: () => void;
  readonly onSelectScaleFingeringHand: (hand: ScaleFingeringHand) => void;
  readonly onSelectScaleFingeringDirection: (direction: ScaleFingeringDirection) => void;
  readonly scaleDisplayMode: ScaleDisplayMode;
  readonly onSelectScaleDisplayMode: (mode: ScaleDisplayMode) => void;
  readonly labelsVisible: boolean;
  readonly labelMode: LabelMode;
  readonly onToggleLabels: () => void;
  readonly onSelectLabelMode: (labelMode: LabelMode) => void;
  readonly cameraZoom: number;
  readonly onChangeCameraZoom: (cameraZoom: number) => void;
  readonly onResetCameraZoom: () => void;
  readonly colorLegend: readonly ColorLegendItem[];
  readonly onOpenTheory: (target: TheoryOverlayContextTarget) => void;
}

/** Все настройки отображения собраны в одном меню, чтобы не перегружать шапку. */
function ViewMenu({
  chordLayerEnabled,
  onToggleChordLayer,
  chordEchoEnabled,
  onToggleChordEcho,
  scaleFingeringEnabled,
  scaleFingeringHand,
  scaleFingeringDirection,
  onToggleScaleFingering,
  onSelectScaleFingeringHand,
  onSelectScaleFingeringDirection,
  scaleDisplayMode,
  onSelectScaleDisplayMode,
  labelsVisible,
  labelMode,
  onToggleLabels,
  onSelectLabelMode,
  cameraZoom,
  onChangeCameraZoom,
  onResetCameraZoom,
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
            <span className="hud-view-menu__label">Вид гаммы</span>
            <ScaleDisplayModeControl
              scaleDisplayMode={scaleDisplayMode}
              onSelectScaleDisplayMode={onSelectScaleDisplayMode}
            />
          </div>
          <div className="hud-view-menu__row">
            <span className="hud-view-menu__label">Камера</span>
            <CameraZoomControl
              cameraZoom={cameraZoom}
              onChangeCameraZoom={onChangeCameraZoom}
              onResetCameraZoom={onResetCameraZoom}
            />
          </div>
          <div className="hud-view-menu__row">
            <span className="hud-view-menu__label">Слой аккорда</span>
            <div className="hud-view-menu__toggle-row">
              <button
                className="hud-toggle"
                type="button"
                aria-pressed={!chordLayerEnabled}
                onClick={onToggleChordLayer}
              >
                Только гамма
              </button>
              <button
                className="hud-toggle"
                type="button"
                aria-pressed={chordEchoEnabled}
                onClick={onToggleChordEcho}
              >
                Дубли аккорда
              </button>
            </div>
          </div>
          <div className="hud-view-menu__row">
            <span className="hud-view-menu__label">Аппликатура гаммы</span>
            <ScaleFingeringControl
              enabled={scaleFingeringEnabled}
              hand={scaleFingeringHand}
              direction={scaleFingeringDirection}
              handDirectionEnabled={scaleDisplayMode === 'strip'}
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
