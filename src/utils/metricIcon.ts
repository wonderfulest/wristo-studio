import { normalizeIconUnicode } from '@/types/amoledIcons'
import { resolveIconGlyphText } from '@/utils/iconGlyph'

export interface MetricIconSource {
  iconUnicode?: unknown
  icon?: unknown
}

export const resolveMetricIconUnicode = (
  metric?: MetricIconSource | null,
  ...fallbacks: unknown[]
): string => {
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
