import type { IconElementConfig, DataElementConfig } from '@/types/elements'
import { DEFAULT_TEXT_CONFIG, EDITOR_ELEMENT } from './base'

const base = DEFAULT_TEXT_CONFIG

export const DEFAULT_DATA_CONFIG: DataElementConfig & EDITOR_ELEMENT = {
  icon: 'mdi:database-outline',
  label: 'Data',
  eleType: 'data',
  id: '',
  left: base.left,
  top: base.top,
  originX: 'center',
  originY: 'center',
  fill: base.fill || '#FFFFFF',
  fontSize: 42,
  fontFamily: 'super-icons',
  metricSymbol: ':FIELD_TYPE_HEART_RATE',
}

export const DEFAULT_LABEL_CONFIG: DataElementConfig & EDITOR_ELEMENT = {
  ...DEFAULT_DATA_CONFIG,
  icon: 'mdi:label-outline',
  label: 'Label',
  eleType: 'label',
}

export const DEFAULT_UNIT_CONFIG: DataElementConfig & EDITOR_ELEMENT = {
  ...DEFAULT_DATA_CONFIG,
  icon: 'mdi:ruler-square',
  label: 'Unit',
  eleType: 'unit',
}

export const DEFAULT_ICON_CONFIG: IconElementConfig & EDITOR_ELEMENT = {
  ...DEFAULT_DATA_CONFIG,
  icon: 'mdi:image-outline',
  label: 'Icon',
  eleType: 'icon',
  iconFont: 'super-icons',
  iconSize: 42,
}
