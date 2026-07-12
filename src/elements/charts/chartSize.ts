export type ResizableChartType = 'barChart' | 'lineChart'

const LIMITS = {
  barChart: { minWidth: 60, maxWidth: 454, minHeight: 20, maxHeight: 227 },
  lineChart: { minWidth: 50, maxWidth: 454, minHeight: 20, maxHeight: 227 },
} as const

function safeScale(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function normalizeChartSize(
  type: ResizableChartType,
  width: number,
  height: number,
  scaleX = 1,
  scaleY = 1,
): { width: number; height: number } {
  const limits = LIMITS[type]
  return {
    width: Math.round(clamp(width * safeScale(scaleX), limits.minWidth, limits.maxWidth)),
    height: Math.round(clamp(height * safeScale(scaleY), limits.minHeight, limits.maxHeight)),
  }
}
