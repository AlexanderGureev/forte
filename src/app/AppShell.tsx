import { useEffect, useState } from 'react';
import { PianoStudioScene } from '../scene/PianoStudioScene';
import { ChordPanel } from '../ui/hud/ChordPanel';
import { ColorLegend } from '../ui/hud/ColorLegend';
import { LabelModeControl } from '../ui/hud/LabelModeControl';
import { ProgressionHud } from '../ui/hud/ProgressionHud';
import { RecommendedKeys } from '../ui/hud/RecommendedKeys';
import { ScaleStrip } from '../ui/hud/ScaleStrip';
import { TopHud } from '../ui/hud/TopHud';
import {
  TheoryOverlay,
  usePrimitiveHotkeys,
  usePrimitiveUiConfig
} from '../ui/primitives';
import { useAppStore } from '../state/app-state';
import {
  selectActiveChordStatus,
  selectActiveProgressionCards,
  selectChordList,
  selectColorLegend,
  selectKeyboardViewModel,
  selectRecommendedKeys,
  selectScaleSummary,
  selectTheoryOverlayModel
} from '../state/selectors';
import { getEnharmonicOptionsForPitchClass, getSupportedKeys } from '../music/keys';
import { getProgressionPresets } from '../music/progressions';
import type {
  KeyboardKeyViewModel,
  KeyboardViewport,
  NoteName,
  PhysicalPitchClass
} from '../music/types';

type MobileSheet = 'keys' | 'chords';

/** Ширины боковых зон HUD для кадрирования камеры (px). */
const RAIL_EXPANDED_PX = 272;
const RAIL_COLLAPSED_PX = 48;
const HUD_SIDE_BASE_PX = 84;

const NATURAL_TONIC_BY_PITCH_CLASS: Partial<Record<PhysicalPitchClass, NoteName>> = {
  0: 'C',
  2: 'D',
  4: 'E',
  5: 'F',
  7: 'G',
  9: 'A',
  11: 'B'
};

export function AppShell() {
  const store = useAppStore();
  const viewport = useKeyboardViewport();
  const isWide = viewport === 'desktop';
  const uiConfig = usePrimitiveUiConfig(store.focusMode);
  usePrimitiveHotkeys();

  const [enharmonicPitchClass, setEnharmonicPitchClass] = useState<PhysicalPitchClass | null>(null);
  const [openSheet, setSheet] = useState<MobileSheet | null>(null);
  const sheet = store.focusMode ? null : openSheet;

  // На узких десктопах боковые панели свернуты по умолчанию, чтобы клавиатура
  // оставалась главным элементом сцены; ручной выбор пользователя приоритетнее.
  const isNarrowDesktop = useNarrowDesktop();
  const [leftCollapsedOverride, setLeftCollapsedOverride] = useState<boolean | null>(null);
  const [rightCollapsedOverride, setRightCollapsedOverride] = useState<boolean | null>(null);
  const leftCollapsed = leftCollapsedOverride ?? isNarrowDesktop;
  const rightCollapsed = rightCollapsedOverride ?? isNarrowDesktop;

  // Фактическая ширина боковых панелей: свернутые ярлыки и фокус-режим отдают
  // освободившееся место клавиатуре. Клавиатура центрирована, поэтому считаем
  // симметричный худший случай — иначе она уехала бы под единственную открытую панель.
  const leftRailPx = !uiConfig.visiblePanels.keySelector ? 0 : leftCollapsed ? RAIL_COLLAPSED_PX : RAIL_EXPANDED_PX;
  const rightRailPx = !uiConfig.visiblePanels.chordPanel ? 0 : rightCollapsed ? RAIL_COLLAPSED_PX : RAIL_EXPANDED_PX;
  const hudSidePx = isWide
    ? HUD_SIDE_BASE_PX + 2 * Math.max(leftRailPx, rightRailPx)
    : undefined;

  const scaleSummary = selectScaleSummary(store);
  const chordCards = selectChordList(store);
  const progressionCards = selectActiveProgressionCards(store);
  const activeChordStatus = selectActiveChordStatus(store);
  const recommendedKeys = selectRecommendedKeys(store);
  const colorLegend = selectColorLegend();
  const keyboardViewModel = selectKeyboardViewModel(store, viewport);
  const theoryOverlayModel = selectTheoryOverlayModel(store);
  const progressionPresets = getProgressionPresets(store.mode);
  const supportedKeys = getSupportedKeys().map((key) => ({
    key,
    selected: key.id === scaleSummary.key.id
  }));
  const enharmonicOptions =
    enharmonicPitchClass === null
      ? []
      : getEnharmonicOptionsForPitchClass(enharmonicPitchClass, store.mode);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (enharmonicPitchClass !== null) {
        setEnharmonicPitchClass(null);
      } else if (sheet !== null) {
        setSheet(null);
      } else if (store.theoryOverlay.isOpen) {
        store.closeTheoryOverlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enharmonicPitchClass, sheet, store]);

  const handleSelectKey3D = (key: KeyboardKeyViewModel) => {
    if (key.isBlackKey) {
      setEnharmonicPitchClass(key.physicalPitchClass);
      return;
    }

    const tonic = NATURAL_TONIC_BY_PITCH_CLASS[key.physicalPitchClass];

    if (tonic !== undefined) {
      store.selectKey({ tonic, mode: store.mode });
    }
  };

  const makeKeysPanel = (onCollapse?: () => void) => (
    <RecommendedKeys
      recommendedKeys={recommendedKeys}
      supportedKeys={supportedKeys}
      onSelectKey={(key) => {
        store.selectKey(key.id);
        setSheet(null);
      }}
      onOpenTheory={store.openTheoryOverlay}
      onCollapse={onCollapse}
    />
  );

  const makeChordsPanel = (onCollapse?: () => void) => (
    <ChordPanel
      chords={chordCards}
      onSelectChord={store.selectChordDegree}
      chordLayerEnabled={store.chordLayerEnabled}
      onOpenTheory={store.openTheoryOverlay}
      onCollapse={onCollapse}
    />
  );

  const legendPanel = <ColorLegend items={colorLegend} onOpenTheory={store.openTheoryOverlay} />;

  return (
    <div className="app-stage" data-focus={store.focusMode ? 'true' : 'false'}>
      <div className="app-stage__scene" aria-hidden="true">
        <PianoStudioScene
          viewModel={keyboardViewModel}
          chordRootPitchClass={activeChordStatus.chord.notes[0].physicalPitchClass}
          motionEnabled={uiConfig.decorativeMotionEnabled}
          hudSidePx={hudSidePx}
          onSelectKey={handleSelectKey3D}
        />
      </div>

      <div className="hud" data-layout={isWide ? 'wide' : 'compact'}>
        <TopHud
          scaleSummary={scaleSummary}
          mode={store.mode}
          onSelectMode={store.selectMode}
          labelMode={store.labelMode}
          onSelectLabelMode={store.setLabelMode}
          labelsVisible={store.labelsVisible}
          onToggleLabels={store.toggleLabelsVisible}
          chordLayerEnabled={store.chordLayerEnabled}
          onToggleChordLayer={store.toggleChordLayer}
          focusMode={store.focusMode}
          onToggleFocus={store.toggleFocusMode}
          onOpenTheory={store.openTheoryOverlay}
          colorLegend={colorLegend}
          showSecondaryControls={uiConfig.visiblePanels.theoryHints}
          compact={!isWide}
        />

        {isWide && uiConfig.visiblePanels.keySelector ? (
          <aside className="hud-rail hud-rail--left" data-collapsed={leftCollapsed ? 'true' : 'false'}>
            {leftCollapsed ? (
              <button
                className="hud-rail-tab"
                type="button"
                aria-expanded="false"
                onClick={() => setLeftCollapsedOverride(false)}
              >
                Тональность
              </button>
            ) : (
              makeKeysPanel(() => setLeftCollapsedOverride(true))
            )}
          </aside>
        ) : null}

        {isWide && uiConfig.visiblePanels.chordPanel ? (
          <aside className="hud-rail hud-rail--right" data-collapsed={rightCollapsed ? 'true' : 'false'}>
            {rightCollapsed ? (
              <button
                className="hud-rail-tab"
                type="button"
                aria-expanded="false"
                onClick={() => setRightCollapsedOverride(false)}
              >
                Аккорды
              </button>
            ) : (
              makeChordsPanel(() => setRightCollapsedOverride(true))
            )}
          </aside>
        ) : null}

        <div className="hud-center">
          <ProgressionHud
            presets={progressionPresets}
            selectedProgressionId={store.selectedProgressionId}
            onSelectPreset={store.selectProgressionPreset}
            cards={progressionCards}
            onSelectStep={store.selectActiveProgressionStep}
            status={activeChordStatus}
            onOpenTheory={store.openTheoryOverlay}
          />
        </div>

        <div className="hud-bottom">
          <ScaleStrip
            scaleSummary={scaleSummary}
            onOpenTheory={store.openTheoryOverlay}
            className="hud-scale-strip--floating"
          />
        </div>

        {!isWide ? (
          <nav className="hud-toolbar" aria-label="Панели управления">
            {uiConfig.visiblePanels.keySelector ? (
              <button
                className="hud-action"
                type="button"
                aria-pressed={sheet === 'keys'}
                onClick={() => setSheet(sheet === 'keys' ? null : 'keys')}
              >
                Тональность
              </button>
            ) : null}
            {uiConfig.visiblePanels.chordPanel ? (
              <button
                className="hud-action"
                type="button"
                aria-pressed={sheet === 'chords'}
                onClick={() => setSheet(sheet === 'chords' ? null : 'chords')}
              >
                Аккорды
              </button>
            ) : null}
            <button className="hud-action" type="button" onClick={() => store.openTheoryOverlay('key')}>
              Теория
            </button>
            <button
              className="hud-action"
              type="button"
              aria-pressed={store.focusMode}
              data-active={store.focusMode ? 'true' : 'false'}
              onClick={store.toggleFocusMode}
            >
              Фокус
            </button>
          </nav>
        ) : null}
      </div>

      {sheet !== null ? (
        <div className="sheet-layer">
          <button
            className="layer-backdrop"
            type="button"
            aria-label="Закрыть панель"
            onClick={() => setSheet(null)}
          />
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={sheet === 'keys' ? 'Выбор тональности' : 'Диатонические аккорды'}
          >
            <header className="sheet__header">
              <span className="hud-eyebrow">
                {sheet === 'keys' ? 'Тональность и вид' : 'Аккорды'}
              </span>
              <button
                className="hud-action"
                type="button"
                aria-label="Закрыть панель"
                onClick={() => setSheet(null)}
              >
                Закрыть
              </button>
            </header>
            <div className="sheet__content">
              {sheet === 'keys' ? (
                <>
                  {makeKeysPanel()}
                  <section className="hud-panel sheet__view-controls" aria-label="Настройки вида">
                    <span className="hud-eyebrow">Вид</span>
                    <div className="sheet__view-controls-row">
                      <button
                        className="hud-toggle"
                        type="button"
                        aria-pressed={!store.chordLayerEnabled}
                        onClick={store.toggleChordLayer}
                      >
                        Только гамма
                      </button>
                      <LabelModeControl
                        labelsVisible={store.labelsVisible}
                        labelMode={store.labelMode}
                        onToggleLabels={store.toggleLabelsVisible}
                        onSelectLabelMode={store.setLabelMode}
                      />
                    </div>
                  </section>
                </>
              ) : (
                <>
                  {makeChordsPanel()}
                  {legendPanel}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {enharmonicPitchClass !== null ? (
        <div className="dialog-layer">
          <button
            className="layer-backdrop"
            type="button"
            aria-label="Закрыть выбор названия"
            onClick={() => setEnharmonicPitchClass(null)}
          />
          <div
            className="dialog hud-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Выбор теоретического имени тоники"
          >
            <p className="hud-eyebrow">Черная клавиша</p>
            <h2 className="dialog__title">Как назвать тонику?</h2>
            {enharmonicOptions.length === 0 ? (
              <p className="dialog__empty">
                Для этого лада у клавиши нет поддерживаемых тональностей.
              </p>
            ) : (
              <div className="dialog__options">
                {enharmonicOptions.map((option) => (
                  <button
                    key={option.id}
                    className="dialog__option"
                    type="button"
                    onClick={() => {
                      store.selectKey(option.id);
                      setEnharmonicPitchClass(null);
                    }}
                  >
                    <span className="dialog__option-name">{option.displayName}</span>
                    <span className="dialog__option-meta">
                      {option.keySignature.count === 0
                        ? 'без знаков'
                        : `${option.keySignature.count}${
                            option.keySignature.accidental === 'sharp' ? '#' : 'b'
                          }`}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button
              className="hud-action dialog__cancel"
              type="button"
              onClick={() => setEnharmonicPitchClass(null)}
            >
              Отмена
            </button>
          </div>
        </div>
      ) : null}

      {theoryOverlayModel.isOpen ? (
        <div className="theory-layer">
          <button
            className="layer-backdrop"
            type="button"
            aria-label="Закрыть теорию"
            onClick={store.closeTheoryOverlay}
          />
          <TheoryOverlay
            model={theoryOverlayModel}
            onClose={store.closeTheoryOverlay}
            className="theory-panel"
          />
        </div>
      ) : null}
    </div>
  );
}

function canUseMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

function useNarrowDesktop(): boolean {
  const [isNarrow, setIsNarrow] = useState(
    () => canUseMatchMedia() && window.matchMedia('(max-width: 1479px)').matches
  );

  useEffect(() => {
    if (!canUseMatchMedia()) {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 1479px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsNarrow(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isNarrow;
}

function useKeyboardViewport(): KeyboardViewport {
  const [viewport, setViewport] = useState<KeyboardViewport>(readKeyboardViewport);

  useEffect(() => {
    const handleResize = () => {
      setViewport(readKeyboardViewport());
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return viewport;
}

function readKeyboardViewport(): KeyboardViewport {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  if (window.innerWidth < 720) {
    return 'mobile';
  }

  return window.innerWidth < 1180 ? 'tablet' : 'desktop';
}
