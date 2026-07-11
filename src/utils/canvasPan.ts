export interface CanvasPanPoint {
  x: number
  y: number
}

export interface CanvasPanRect {
  left: number
  top: number
  width: number
  height: number
}

export const CANVAS_LONG_PRESS_DELAY_MS = 400
export const CANVAS_LONG_PRESS_TOLERANCE_PX = 6

export function hasExceededCanvasLongPressTolerance(
  start: CanvasPanPoint,
  current: CanvasPanPoint,
  tolerance = CANVAS_LONG_PRESS_TOLERANCE_PX,
): boolean {
  const safeTolerance = Math.max(0, tolerance)
  const deltaX = current.x - start.x
  const deltaY = current.y - start.y
  return deltaX * deltaX + deltaY * deltaY > safeTolerance * safeTolerance
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export function isPointOutsideWatchFace(
  point: CanvasPanPoint,
  faceRect: CanvasPanRect,
  isRound: boolean,
): boolean {
  const width = Math.max(0, faceRect.width)
  const height = Math.max(0, faceRect.height)
  if (width === 0 || height === 0) return true

  const right = faceRect.left + width
  const bottom = faceRect.top + height
  if (!isRound) {
    return point.x < faceRect.left || point.x > right || point.y < faceRect.top || point.y > bottom
  }

  const centerX = faceRect.left + width / 2
  const centerY = faceRect.top + height / 2
  const radius = Math.min(width, height) / 2
  const deltaX = point.x - centerX
  const deltaY = point.y - centerY
  return deltaX * deltaX + deltaY * deltaY > radius * radius
}

export function clampCanvasPanOffset(
  desiredOffset: CanvasPanPoint,
  stageBaseRect: CanvasPanRect,
  workspaceRect: CanvasPanRect,
  minimumVisible = 64,
): CanvasPanPoint {
  const stageWidth = Math.max(0, stageBaseRect.width)
  const stageHeight = Math.max(0, stageBaseRect.height)
  const workspaceWidth = Math.max(0, workspaceRect.width)
  const workspaceHeight = Math.max(0, workspaceRect.height)
  const visibleX = Math.min(Math.max(0, minimumVisible), stageWidth, workspaceWidth)
  const visibleY = Math.min(Math.max(0, minimumVisible), stageHeight, workspaceHeight)

  const minX = workspaceRect.left + visibleX - (stageBaseRect.left + stageWidth)
  const maxX = workspaceRect.left + workspaceWidth - visibleX - stageBaseRect.left
  const minY = workspaceRect.top + visibleY - (stageBaseRect.top + stageHeight)
  const maxY = workspaceRect.top + workspaceHeight - visibleY - stageBaseRect.top

  return {
    x: clamp(desiredOffset.x, Math.min(minX, maxX), Math.max(minX, maxX)),
    y: clamp(desiredOffset.y, Math.min(minY, maxY), Math.max(minY, maxY)),
  }
}
