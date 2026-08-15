import { normalizeIconUnicode } from '@/types/amoledIcons'
import { resolveIconGlyphText } from '@/utils/iconGlyph'

export interface MetricIconSource {
  metricSymbol?: unknown
  iconUnicode?: unknown
  icon?: unknown
}

const WEATHER_CONDITION_METRICS = new Set([
  ':FIELD_TYPE_WEATHER',
  ':FIELD_TYPE_WEATHER_DESCRIPTION',
])

const DEFAULT_WEATHER_ICON_UNICODE = '101d'

export const resolveMetricIconUnicode = (
  metric?: MetricIconSource | null,
  ...fallbacks: unknown[]
): string => {
  if (WEATHER_CONDITION_METRICS.has(String(metric?.metricSymbol ?? '').trim())) {
    return DEFAULT_WEATHER_ICON_UNICODE
  }

  for (const value of [metric?.iconUnicode, metric?.icon, ...fallbacks]) {
    const iconUnicode = normalizeIconUnicode(value)
    if (iconUnicode) return iconUnicode
  }
  return ''
}

export const resolveMetricIconGlyph = (
  metric?: MetricIconSource | null,
  ...fallbacks: unknown[]
): string => resolveIconGlyphText(resolveMetricIconUnicode(metric, ...fallbacks))
