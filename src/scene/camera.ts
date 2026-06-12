import type { KeyboardViewport } from "../music/types";

export interface StudioCameraPlacement {
  readonly position: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly fov: number;
}

const CAMERA_FOV = 41;
const ELEVATION_RADIANS = (62 * Math.PI) / 180;

/**
 * Запас по ширине: на компактных layout панели убраны в sheets
 * и клавиатуре отдается почти вся ширина.
 */
const WIDTH_MARGIN_BY_VIEWPORT: Record<KeyboardViewport, number> = {
  desktop: 1.85,
  tablet: 1.18,
  mobile: 1.06,
};

/** Суммарная ширина боковых HUD-панелей с отступами на desktop (px),
 * когда обе панели развернуты. Фактическое значение приходит из AppShell. */
export const DESKTOP_HUD_SIDE_PX = 628;

/**
 * Подъем точки взгляда опускает клавиатуру в кадре:
 * сверху экран занят HUD-панелями (прогрессия, на mobile — половина экрана).
 * На desktop верхний HUD — одна полоса, поэтому клавиатура стоит выше.
 */
const TARGET_Y_BY_VIEWPORT: Record<KeyboardViewport, number> = {
  desktop: -1.6,
  tablet: 0.2,
  mobile: -0.8,
};

export function getStudioCameraPlacement(
  keyboardWidth: number,
  aspect: number,
  viewport: KeyboardViewport,
  viewportWidthPx: number,
  hudSidePx: number = DESKTOP_HUD_SIDE_PX,
): StudioCameraPlacement {
  const halfVerticalFov = (CAMERA_FOV * Math.PI) / 360;
  const halfHorizontalFov = Math.atan(
    Math.tan(halfVerticalFov) * Math.max(aspect, 0.2),
  );
  const requiredHalfWidth =
    (keyboardWidth * getWidthMargin(viewport, viewportWidthPx, hudSidePx)) / 2;
  const distance = Math.max(
    requiredHalfWidth / Math.tan(halfHorizontalFov),
    16,
  );
  const target = [0, TARGET_Y_BY_VIEWPORT[viewport], -0.9] as const;

  return {
    position: [
      target[0],
      target[1] + Math.sin(ELEVATION_RADIANS) * distance,
      target[2] + Math.cos(ELEVATION_RADIANS) * distance,
    ],
    target,
    fov: CAMERA_FOV,
  };
}

/**
 * На desktop клавиатура занимает всю ширину между HUD-панелями
 * (с запасом 6%): свернутые панели отдают свое место клавиатуре.
 */
function getWidthMargin(
  viewport: KeyboardViewport,
  viewportWidthPx: number,
  hudSidePx: number,
): number {
  if (viewport !== "desktop" || viewportWidthPx <= hudSidePx) {
    return WIDTH_MARGIN_BY_VIEWPORT[viewport];
  }

  const freeFraction = (viewportWidthPx - hudSidePx) / viewportWidthPx;

  return Math.min(Math.max(1.06 / freeFraction, 1.18), 2.1);
}
