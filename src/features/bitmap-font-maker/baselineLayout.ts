/** Positive angles rise to the right in screen coordinates. */
export function baselineSlope(angle = 0): number {
  if (!angle || !Number.isFinite(angle)) return 0
  return -Math.tan(Math.max(-20, Math.min(20, Number.isFinite(angle) ? angle : 0)) * Math.PI / 180)
}

export function baselineRise(angle: number | undefined, cursor: number, advance: number, width: number): number {
  return baselineSlope(angle) * (cursor + advance / 2 - width / 2)
}

export function baselinePadding(angle: number | undefined, width: number): number {
  return Math.abs(baselineSlope(angle)) * width / 2
}
