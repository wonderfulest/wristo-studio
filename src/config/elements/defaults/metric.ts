import type { IconElementConfig, DataElementConfig } from '@/types/elements'
import { DEFAULT_TEXT_CONFIG, EDITOR_ELEMENT } from './base'

export const DEFAULT_DATA_CONFIG: DataElementConfig & EDITOR_ELEMENT = Object.assign(
  {},
  DEFAULT_TEXT_CONFIG,
  {
    icon: 'mdi:database-outline',
    label: 'Data',
    eleType: 'data' as const,
    metricSymbol: ':FIELD_TYPE_HEART_RATE',
    iconSize: 42,
    iconFont: 'super-icons',
  },
)

export const DEFAULT_LABEL_CONFIG: DataElementConfig & EDITOR_ELEMENT = Object.assign(
  {},
  DEFAULT_DATA_CONFIG,
  {
    icon: 'mdi:label-outline',
    label: 'Label',
    eleType: 'label' as const,
    metricSymbol: ':FIELD_TYPE_HEART_RATE',
  },
)

export const DEFAULT_UNIT_CONFIG: DataElementConfig & EDITOR_ELEMENT = Object.assign(
  {},
  DEFAULT_DATA_CONFIG,
  {
    icon: 'mdi:ruler-square',
    label: 'Unit',
    eleType: 'unit' as const,
    metricSymbol: ':FIELD_TYPE_HEART_RATE',
  },
)

export const DEFAULT_ICON_CONFIG: IconElementConfig & EDITOR_ELEMENT = Object.assign(
  {},
  DEFAULT_DATA_CONFIG,
  {
    icon: 'mdi:image-outline',
    label: 'Icon',
    eleType: 'icon' as const,
  },
)
