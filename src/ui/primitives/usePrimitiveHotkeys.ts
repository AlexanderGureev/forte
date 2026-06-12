import { useEffect } from 'react';
import { useAppStore } from '../../state/app-state';
import { selectActiveProgressionCards } from '../../state/selectors';
import type { LabelMode, Mode, TheoryOverlayContextTarget } from '../../music/types';

export interface PrimitiveHotkeyOptions {
  readonly enabled?: boolean;
  readonly theoryContextTarget?: TheoryOverlayContextTarget;
}

type PrimitiveHotkey =
  | 'previousProgressionStep'
  | 'nextProgressionStep'
  | 'toggleMode'
  | 'toggleLabels'
  | 'toggleLabelMode'
  | 'toggleFocusMode'
  | 'openTheoryOverlay';

export function usePrimitiveHotkeys({
  enabled = true,
  theoryContextTarget = 'key'
}: PrimitiveHotkeyOptions = {}): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (isEditableEventTarget(event.target)) {
        return;
      }

      const hotkey = normalizeHotkey(event);

      if (hotkey === null) {
        return;
      }

      event.preventDefault();
      runPrimitiveHotkey(hotkey, theoryContextTarget);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, theoryContextTarget]);
}

function runPrimitiveHotkey(
  hotkey: PrimitiveHotkey,
  theoryContextTarget: TheoryOverlayContextTarget
): void {
  const state = useAppStore.getState();

  if (hotkey === 'previousProgressionStep') {
    selectRelativeProgressionStep(-1);
    return;
  }

  if (hotkey === 'nextProgressionStep') {
    selectRelativeProgressionStep(1);
    return;
  }

  if (hotkey === 'toggleMode') {
    state.selectMode(getNextMode(state.mode));
    return;
  }

  if (hotkey === 'toggleLabels') {
    state.toggleLabelsVisible();
    return;
  }

  if (hotkey === 'toggleLabelMode') {
    state.setLabelMode(getNextLabelMode(state.labelMode));
    return;
  }

  if (hotkey === 'toggleFocusMode') {
    state.toggleFocusMode();
    return;
  }

  state.openTheoryOverlay(theoryContextTarget);
}

function selectRelativeProgressionStep(direction: -1 | 1): void {
  const state = useAppStore.getState();
  const cards = selectActiveProgressionCards(state);

  if (cards.length === 0) {
    return;
  }

  const nextStepIndex =
    (state.activeProgressionStepIndex + direction + cards.length) % cards.length;

  state.selectActiveProgressionStep(nextStepIndex);
}

function normalizeHotkey(event: KeyboardEvent): PrimitiveHotkey | null {
  if (event.key === 'ArrowLeft') {
    return 'previousProgressionStep';
  }

  if (event.key === 'ArrowRight') {
    return 'nextProgressionStep';
  }

  const key = event.key.toLowerCase();

  if (key === 'm') {
    return 'toggleMode';
  }

  if (key === 'l') {
    return 'toggleLabels';
  }

  if (key === 'd') {
    return 'toggleLabelMode';
  }

  if (key === 'f') {
    return 'toggleFocusMode';
  }

  if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
    return 'openTheoryOverlay';
  }

  return null;
}

function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const editableTarget = target.closest(
    'input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]'
  );

  return editableTarget !== null;
}

function getNextMode(mode: Mode): Mode {
  return mode === 'major' ? 'naturalMinor' : 'major';
}

function getNextLabelMode(labelMode: LabelMode): LabelMode {
  return labelMode === 'notes' ? 'degrees' : 'notes';
}
