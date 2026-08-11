export type TrianglePoint = { x: number; y: number }

function normalizeDimension(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1
}

export function buildTriangleCanvasGeometry(width: number, height: number): {
  width: number
  height: number
  points: TrianglePoint[]
  pathOffset: TrianglePoint
} {
  const safeWidth = normalizeDimension(Number(width))
  const safeHeight = normalizeDimension(Number(height))

  return {
    width: safeWidth,
    height: safeHeight,
    points: [
      { x: safeWidth / 2, y: 0 },
      { x: safeWidth, y: safeHeight },
      { x: 0, y: safeHeight },
    ],
    pathOffset: { x: safeWidth / 2, y: safeHeight / 2 },
  }
}
