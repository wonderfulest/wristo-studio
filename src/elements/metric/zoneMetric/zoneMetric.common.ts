export type ZoneMetricDisplayMode = 'rectangle' | 'ring'
export type ZoneMetricPreset = 'heartRate' | 'sedentary' | 'custom'

export type ZoneMetricZone = {
  key: string
  label: string
  min: number
  max: number
  color: string
}

export const HEART_RATE_ZONES: ZoneMetricZone[] = [
  { key: 'z1', label: 'Z1 Warm Up', min: 0, max: 108, color: '#67E8F9' },
  { key: 'z2', label: 'Z2 Easy', min: 109, max: 126, color: '#34D399' },
  { key: 'z3', label: 'Z3 Aerobic', min: 127, max: 144, color: '#FACC15' },
  { key: 'z4', label: 'Z4 Threshold', min: 145, max: 162, color: '#FB923C' },
  { key: 'z5', label: 'Z5 Max', min: 163, max: 220, color: '#F43F5E' },
]

export const SEDENTARY_ZONES: ZoneMetricZone[] = [
  { key: 'idle', label: 'Idle', min: 0, max: 14, color: '#38BDF8' },
  { key: 'soon', label: 'Move Soon', min: 15, max: 29, color: '#A3E635' },
  { key: 'move', label: 'Move', min: 30, max: 44, color: '#FACC15' },
  { key: 'overdue', label: 'Overdue', min: 45, max: 59, color: '#FB923C' },
  { key: 'longIdle', label: 'Long Idle', min: 60, max: 180, color: '#EF4444' },
]

export function clampNumber(value: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

export function getPresetZones(preset: ZoneMetricPreset, customZones?: ZoneMetricZone[]): ZoneMetricZone[] {
  if (preset === 'sedentary') return SEDENTARY_ZONES
  if (preset === 'custom' && Array.isArray(customZones) && customZones.length) return customZones
  return HEART_RATE_ZONES
}

export function resolveZone(value: number, zones: ZoneMetricZone[]): ZoneMetricZone {
  const hit = zones.find((zone) => value >= zone.min && value <= zone.max)
  if (hit) return hit
  if (!zones.length) return { key: 'unknown', label: 'Unknown', min: 0, max: 0, color: '#FFFFFF' }
  if (value < zones[0].min) return zones[0]
  return zones[zones.length - 1]
}

export function resolvePresetDefaults(preset: ZoneMetricPreset): { label: string; unit: string; value: number } {
  if (preset === 'sedentary') return { label: 'MOVE', unit: 'MIN', value: 36 }
  return { label: 'HR', unit: 'BPM', value: 163 }
}
