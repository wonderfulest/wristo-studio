export interface HandGeometryInput {
  left?: number
  top?: number
  centerX?: number
  centerY?: number
  pivotOffsetX?: number
  pivotOffsetY?: number
  scalePercent?: number
}

export interface HandGeometry {
  centerX: number
  centerY: number
  pivotOffsetX: number
  pivotOffsetY: number
  pivotX: number
  pivotY: number
  scalePercent: number
  imageScale: number
}

type HandCenter = Pick<HandGeometry, 'centerX' | 'centerY'>
type HandCenterWithOffset = HandCenter & Pick<HandGeometry, 'pivotOffsetX' | 'pivotOffsetY'>
type CanvasPoint = { x: number; y: number }

export function getHandPivot(geometry: HandCenterWithOffset): CanvasPoint {
  return {
    x: geometry.centerX + geometry.pivotOffsetX,
    y: geometry.centerY + geometry.pivotOffsetY,
  }
}

export function moveHandCenterKeepingPivot(
  geometry: HandCenterWithOffset,
  nextCenter: CanvasPoint,
): HandCenterWithOffset & { pivotX: number; pivotY: number } {
  const pivot = getHandPivot(geometry)
  return {
    centerX: nextCenter.x,
    centerY: nextCenter.y,
    pivotOffsetX: pivot.x - nextCenter.x,
    pivotOffsetY: pivot.y - nextCenter.y,
    pivotX: pivot.x,
    pivotY: pivot.y,
  }
}

export function moveHandPivotKeepingCenter(
  geometry: HandCenter,
  nextPivot: CanvasPoint,
): HandCenterWithOffset & { pivotX: number; pivotY: number } {
  return {
    centerX: geometry.centerX,
    centerY: geometry.centerY,
    pivotOffsetX: nextPivot.x - geometry.centerX,
    pivotOffsetY: nextPivot.y - geometry.centerY,
    pivotX: nextPivot.x,
    pivotY: nextPivot.y,
  }
}

function finiteOr(value: unknown, fallback: number): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function handScaleSliderToPercent(position: number): number {
  const normalized = clamp(finiteOr(position, 50), 0, 100)
  if (normalized <= 50) return Math.round(10 + normalized / 50 * 90)
  return Math.round(100 + (normalized - 50) / 50 * 400)
}

export function handScalePercentToSlider(percent: number): number {
  const normalized = clamp(finiteOr(percent, 100), 10, 500)
  if (normalized <= 100) return (normalized - 10) / 90 * 50
  return 50 + (normalized - 100) / 400 * 50
}

export function getHandGeometry(
  input: HandGeometryInput,
  scaleBase: number,
  imageWidth: number,
  imageHeight: number,
): HandGeometry {
  const centerX = finiteOr(input.centerX, finiteOr(input.left, 0))
  const centerY = finiteOr(input.centerY, finiteOr(input.top, 0))
  const pivotOffsetX = finiteOr(input.pivotOffsetX, 0)
  const pivotOffsetY = finiteOr(input.pivotOffsetY, 0)
  const requestedScale = finiteOr(input.scalePercent, 100)
  const scalePercent = requestedScale > 0 ? clamp(requestedScale, 10, 500) : 100
  const longestSide = Math.max(1, finiteOr(imageWidth, 0), finiteOr(imageHeight, 0))
  const imageScale = finiteOr(scaleBase, 0) / longestSide * scalePercent / 100

  return {
    centerX,
    centerY,
    pivotOffsetX,
    pivotOffsetY,
    pivotX: centerX + pivotOffsetX,
    pivotY: centerY + pivotOffsetY,
    scalePercent,
    imageScale,
  }
}

export function getRotatedHandCenter(
  geometry: Pick<HandGeometry, 'centerX' | 'centerY' | 'pivotOffsetX' | 'pivotOffsetY'>,
  angle: number,
): { left: number; top: number } {
  const radians = finiteOr(angle, 0) * Math.PI / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const dx = -geometry.pivotOffsetX
  const dy = -geometry.pivotOffsetY
  const pivotX = geometry.centerX + geometry.pivotOffsetX
  const pivotY = geometry.centerY + geometry.pivotOffsetY

  return {
    left: pivotX + dx * cos - dy * sin,
    top: pivotY + dx * sin + dy * cos,
  }
}
