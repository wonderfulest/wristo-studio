export const WATCH_PREVIEW_DIAMETERS = [240, 360, 390, 454] as const

const WATCH_CONTENT_MARGIN = 28

export function chooseWatchPreviewDiameter(width: number, height: number): number {
  const requiredDiameter = Math.hypot(Math.max(0, width), Math.max(0, height)) + WATCH_CONTENT_MARGIN
  return WATCH_PREVIEW_DIAMETERS.find(diameter => diameter >= requiredDiameter)
    ?? WATCH_PREVIEW_DIAMETERS[WATCH_PREVIEW_DIAMETERS.length - 1]
}

export function watchPreviewContentDiameter(diameter: number): number {
  return Math.max(1, diameter - WATCH_CONTENT_MARGIN)
}
