export type GridLineSegment = [number, number, number, number]

const positiveNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function buildGridLineSegments(
  widthValue: unknown,
  heightValue: unknown,
  spacingValue: unknown,
): GridLineSegment[] {
  const width = positiveNumber(widthValue, 1)
  const height = positiveNumber(heightValue, 1)
  const spacing = positiveNumber(spacingValue, 1)
  const halfWidth = width / 2
  const halfHeight = height / 2
  const firstOffset = Math.ceil(-halfHeight / spacing) * spacing
  const segments: GridLineSegment[] = []

  for (let offset = firstOffset; offset <= halfHeight + 1e-9; offset += spacing) {
    const normalizedOffset = Math.abs(offset) < 1e-9 ? 0 : Number(offset.toFixed(6))
    segments.push([-halfWidth, normalizedOffset, halfWidth, normalizedOffset])
  }

  return segments
}

export function normalizeGridLinesSize(
  widthValue: unknown,
  heightValue: unknown,
  scaleXValue: unknown,
  scaleYValue: unknown,
): { width: number; height: number } {
  const width = positiveNumber(widthValue, 1)
  const height = positiveNumber(heightValue, 1)
  const rawScaleX = Number(scaleXValue)
  const rawScaleY = Number(scaleYValue)
  const scaleX = Number.isFinite(rawScaleX) && rawScaleX !== 0 ? Math.abs(rawScaleX) : 1
  const scaleY = Number.isFinite(rawScaleY) && rawScaleY !== 0 ? Math.abs(rawScaleY) : 1

  return {
    width: Number((width * scaleX).toFixed(6)),
    height: Number((height * scaleY).toFixed(6)),
  }
}
