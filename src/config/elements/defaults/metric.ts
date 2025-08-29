import type { IconElementConfig, DataElementConfig } from '@/types/elements'
import { DEFAULT_TEXT_CONFIG, EDITOR_ELEMENT } from './base'

export const DEFAULT_DATA_CONFIG: DataElementConfig & EDITOR_ELEMENT = Object.assign(
  {},
  DEFAULT_TEXT_CONFIG,
  {
    icon: 'mdi:clock-time-eight-outline',
    label: 'Data',
    eleType: 'data' as const,
    metricSymbol: ':FIELD_TYPE_HEART_RATE',
    iconSize: 42,
    iconFontFamily: 'super-icons',
  },
)

export const DEFAULT_LABEL_CONFIG: DataElementConfig & EDITOR_ELEMENT = Object.assign(
  {},
  DEFAULT_DATA_CONFIG,
  {
    icon: 'mdi:clock-time-eight-outline',
    label: 'Label',
    eleType: 'label' as const,
    metricSymbol: ':FIELD_TYPE_HEART_RATE',
  },
)

export const DEFAULT_UNIT_CONFIG: DataElementConfig & EDITOR_ELEMENT = Object.assign(
  {},
  DEFAULT_DATA_CONFIG,
  {
    icon: 'mdi:clock-time-eight-outline',
    label: 'Unit',
    eleType: 'unit' as const,
    metricSymbol: ':FIELD_TYPE_HEART_RATE',
  },
)

export const DEFAULT_ICON_CONFIG: IconElementConfig & EDITOR_ELEMENT = Object.assign(
  {},
  DEFAULT_DATA_CONFIG,
  {
    icon: 'mdi:clock-time-eight-outline',
    label: 'Icon',
    eleType: 'icon' as const,
  },
)
