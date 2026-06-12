import { useEffect, useState } from 'react';

export interface PrimitiveUiConfigInput {
  readonly focusMode: boolean;
  readonly prefersReducedMotion: boolean;
}

export interface PrimitivePanelVisibility {
  readonly primaryControls: boolean;
  readonly progression: boolean;
  readonly keySelector: boolean;
  readonly chordPanel: boolean;
  readonly theoryHints: boolean;
  readonly colorLegend: boolean;
}

export interface PrimitiveUiConfig {
  readonly visiblePanels: PrimitivePanelVisibility;
  readonly decorativeMotionEnabled: boolean;
  readonly motionDurationMs: number;
}

export function getPrimitiveUiConfig({
  focusMode,
  prefersReducedMotion
}: PrimitiveUiConfigInput): PrimitiveUiConfig {
  return {
    visiblePanels: {
      primaryControls: true,
      progression: true,
      keySelector: !focusMode,
      chordPanel: !focusMode,
      theoryHints: !focusMode,
      colorLegend: !focusMode
    },
    decorativeMotionEnabled: !prefersReducedMotion,
    motionDurationMs: prefersReducedMotion ? 0 : 180
  };
}

export function usePrimitiveUiConfig(
  focusMode: boolean,
  prefersReducedMotionOverride?: boolean
): PrimitiveUiConfig {
  const systemPrefersReducedMotion = usePrefersReducedMotion();
  const prefersReducedMotion = prefersReducedMotionOverride ?? systemPrefersReducedMotion;

  return getPrimitiveUiConfig({ focusMode, prefersReducedMotion });
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(readPrefersReducedMotion);

  useEffect(() => {
    if (!canReadMotionPreference()) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

function readPrefersReducedMotion(): boolean {
  if (!canReadMotionPreference()) {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function canReadMotionPreference(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}
