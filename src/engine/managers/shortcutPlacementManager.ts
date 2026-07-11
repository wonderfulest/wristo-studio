export interface DesignGeometry {
  width: number
  height: number
  centerX: number
  centerY: number
}

export interface PlacementPoint {
  x: number
  y: number
}

export interface PlacementSize {
  width: number
  height: number
}

export interface PlacementBounds extends PlacementSize {
  left: number
  top: number
}

export function boundsFromCenter(
  center: PlacementPoint,
  size: PlacementSize,
): PlacementBounds {
  return {
    left: center.x - size.width / 2,
    top: center.y - size.height / 2,
    width: size.width,
    height: size.height,
  }
}

export function boundsCenter(bounds: PlacementBounds): PlacementPoint {
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  }
}

export function translateBounds(
  bounds: PlacementBounds,
  dx: number,
  dy: number,
): PlacementBounds {
  return {
    ...bounds,
    left: bounds.left + dx,
    top: bounds.top + dy,
  }
}

export function expandBounds(bounds: PlacementBounds, gap: number): PlacementBounds {
  return {
    left: bounds.left - gap,
    top: bounds.top - gap,
    width: bounds.width + gap * 2,
    height: bounds.height + gap * 2,
  }
}

export function intersectionArea(a: PlacementBounds, b: PlacementBounds): number {
  const width = Math.max(
    0,
    Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left),
  )
  const height = Math.max(
    0,
    Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top),
  )
  return width * height
}

export function unionBounds(bounds: PlacementBounds[]): PlacementBounds | null {
  if (!bounds.length) return null
  const left = Math.min(...bounds.map((item) => item.left))
  const top = Math.min(...bounds.map((item) => item.top))
  const right = Math.max(...bounds.map((item) => item.left + item.width))
  const bottom = Math.max(...bounds.map((item) => item.top + item.height))
  return { left, top, width: right - left, height: bottom - top }
}

export function isBoundsInsideCircle(
  bounds: PlacementBounds,
  geometry: DesignGeometry,
): boolean {
  const radius = Math.min(geometry.width, geometry.height) / 2
  const corners = [
    { x: bounds.left, y: bounds.top },
    { x: bounds.left + bounds.width, y: bounds.top },
    { x: bounds.left, y: bounds.top + bounds.height },
    { x: bounds.left + bounds.width, y: bounds.top + bounds.height },
  ]
  return corners.every(
    ({ x, y }) => Math.hypot(x - geometry.centerX, y - geometry.centerY) <= radius,
  )
}
