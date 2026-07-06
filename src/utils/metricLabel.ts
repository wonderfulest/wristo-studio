import type { DataTypeOption } from '@/types/settings'

export type MetricLabelLanguage = 'en' | 'zh'

const CHINESE_UNIT_BY_ENGLISH_UNIT: Record<string, string> = {
  bpm: '次/分',
  brpm: '次/分',
  steps: '步',
  floors: '层',
  min: '分钟',
  h: '小时',
  km: '公里',
  m: '米',
  ft: '英尺',
  mi: '英里',
  kcal: '千卡',
  C: '℃',
  F: '℉',
  '°C': '℃',
  '°F': '℉',
  deg: '度',
  'µg/m³': '微克/立方米',
  'mg/m³': '毫克/立方米',
}

export function resolveMetricLabel(
  metric: Partial<DataTypeOption> | null | undefined,
  language: MetricLabelLanguage,
): string {
  if (!metric) return 'Label'

  if ((metric as any).metricSymbol === ':FIELD_TYPE_WEATHER') return 'WEATHER'

  if (language === 'zh') {
    const labelCn = String((metric as any).labelCn || '').trim()
    if (labelCn) return labelCn
  }

  const label = String((metric as any).label || '').trim()
  if (label) return label

  const enLabel = (metric as any).enLabel
  if (typeof enLabel === 'string' && enLabel.trim()) {
    return enLabel
  }

  return 'Label'
}

export function resolveMetricUnit(
  metric: Partial<DataTypeOption> | null | undefined,
  language: MetricLabelLanguage,
): string {
  if (!metric) return ''

  if (language === 'zh') {
    const unitCn = String((metric as any).unitCn || '').trim()
    if (unitCn) return unitCn

    const unit = String((metric as any).unit ?? '').trim()
    if (unit && CHINESE_UNIT_BY_ENGLISH_UNIT[unit] !== undefined) {
      return CHINESE_UNIT_BY_ENGLISH_UNIT[unit]
    }
  }

  return String((metric as any).unit ?? '')
}

export function applyMetricTextCase(text: string, textCase: number | undefined): string {
  const value = String(text ?? '')
  if (textCase === 1) {
    return value.toUpperCase()
  }
  if (textCase === 2) {
    return value.toLowerCase()
  }
  if (textCase === 0 || textCase === 3) {
    return value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return value
}
