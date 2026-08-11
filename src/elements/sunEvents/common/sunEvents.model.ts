export const SUN_EVENT_PHASES = [
  { key: 'midnight', label: 'Midnight', altitude: null, color: '#555555' },
  { key: 'astronomicalDawn', label: 'Astronomical dawn', altitude: -18, color: '#000055' },
  { key: 'nauticalDawn', label: 'Nautical dawn', altitude: -12, color: '#0000AA' },
  { key: 'civilDawn', label: 'Civil dawn', altitude: -6, color: '#0000FF' },
  { key: 'blueHourAm', label: 'Blue hour AM', altitude: -4, color: '#0055FF' },
  { key: 'sunrise', label: 'Sunrise', altitude: -0.833, color: '#FFAA00' },
  { key: 'sunriseEnd', label: 'Sunrise end', altitude: -0.3, color: '#FFFF00' },
  { key: 'goldenHourAm', label: 'Golden hour AM', altitude: 6, color: '#FFFFFF' },
  { key: 'noon', label: 'Noon', altitude: null, color: '#FFFFFF' },
  { key: 'goldenHourPm', label: 'Golden hour PM', altitude: 6, color: '#FFFF00' },
  { key: 'sunset', label: 'Sunset', altitude: -0.3, color: '#FFAA00' },
  { key: 'sunsetEnd', label: 'Sunset end', altitude: -0.833, color: '#0055FF' },
  { key: 'blueHourPm', label: 'Blue hour PM', altitude: -4, color: '#0000FF' },
  { key: 'civilDusk', label: 'Civil dusk', altitude: -6, color: '#0000AA' },
  { key: 'nauticalDusk', label: 'Nautical dusk', altitude: -12, color: '#000055' },
  { key: 'astronomicalDusk', label: 'Astronomical dusk', altitude: -18, color: '#555555' },
] as const

export type SunEventPhaseKey = typeof SUN_EVENT_PHASES[number]['key']

export type SunEventPhaseStyle = {
  key: SunEventPhaseKey
  enabled: boolean
  color: string
}

export type SunEventTimes = Partial<Record<SunEventPhaseKey, number | null>>

export type SunEventSegment = {
  start: number
  end: number
  color: string
  phase: SunEventPhaseKey
}

export function createDefaultSunEventStyles(): SunEventPhaseStyle[] {
  return SUN_EVENT_PHASES.map(({ key, color }) => ({ key, enabled: true, color }))
}

function isDayFraction(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1
}

export function normalizeSunEventSegments(input: {
  styles: SunEventPhaseStyle[]
  events: SunEventTimes
}): SunEventSegment[] {
  const styleByKey = new Map(input.styles.map((style) => [style.key, style]))
  const activeStyles = SUN_EVENT_PHASES
    .map(({ key }) => styleByKey.get(key))
    .filter((style): style is SunEventPhaseStyle => Boolean(style?.enabled))

  if (activeStyles.length === 0) return []

  const boundaries = activeStyles
    .map((style) => ({ style, at: input.events[style.key] }))
    .filter((item): item is { style: SunEventPhaseStyle; at: number } => isDayFraction(item.at))
    .sort((left, right) => left.at - right.at)

  if (boundaries.length === 0) {
    const fallback = activeStyles[0]
    return [{ start: 0, end: 1, color: fallback.color, phase: fallback.key }]
  }

  const result: SunEventSegment[] = []
  const finalBoundary = boundaries[boundaries.length - 1]
  let start = 0
  let currentStyle = finalBoundary.style

  for (const boundary of boundaries) {
    if (boundary.at > start) {
      result.push({ start, end: boundary.at, color: currentStyle.color, phase: currentStyle.key })
    }
    start = Math.max(start, boundary.at)
    currentStyle = boundary.style
  }

  if (start < 1) {
    result.push({ start, end: 1, color: currentStyle.color, phase: currentStyle.key })
  }

  return result.filter((segment) => segment.end > segment.start)
}

export function timeFractionToArcAngle(
  fraction: number,
  startAngle: number,
  angleRange: number,
  counterClockwise: boolean,
): number {
  return startAngle + Math.max(0, Math.min(1, fraction)) * angleRange * (counterClockwise ? -1 : 1)
}

export function timeFractionToLinePoint(fraction: number, start: number, end: number): number {
  return start + Math.max(0, Math.min(1, fraction)) * (end - start)
}
