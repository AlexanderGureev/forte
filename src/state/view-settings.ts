export const DEFAULT_CAMERA_ZOOM = 1;
export const CAMERA_ZOOM_MIN = 0.75;
export const CAMERA_ZOOM_MAX = 1.35;
export const CAMERA_ZOOM_STEP = 0.05;

export function normalizeCameraZoom(cameraZoom: number): number {
  if (!Number.isFinite(cameraZoom)) {
    return DEFAULT_CAMERA_ZOOM;
  }

  return Math.min(
    CAMERA_ZOOM_MAX,
    Math.max(CAMERA_ZOOM_MIN, Math.round(cameraZoom * 100) / 100)
  );
}

export function adjustCameraZoom(cameraZoom: number, direction: -1 | 1): number {
  return normalizeCameraZoom(cameraZoom + CAMERA_ZOOM_STEP * direction);
}

export function formatCameraZoomPercent(cameraZoom: number): string {
  return `${Math.round(normalizeCameraZoom(cameraZoom) * 100)}%`;
}
