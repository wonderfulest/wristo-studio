import type { IconElementConfig, DataElementConfig } from '@/types/elements'
import type { MoonElementConfig } from '@/types/elements/data'
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
  fontFamily: 'roboto-condensed-regular',
  metricSymbol: ':FIELD_TYPE_HEART_RATE',
}

export const DEFAULT_LABEL_CONFIG: DataElementConfig & EDITOR_ELEMENT = {
  ...DEFAULT_DATA_CONFIG,
  icon: 'mdi:label-outline',
  label: 'Label',
  eleType: 'label',
  fontFamily: 'roboto-condensed-regular',
}

export const DEFAULT_UNIT_CONFIG: DataElementConfig & EDITOR_ELEMENT = {
  ...DEFAULT_DATA_CONFIG,
  icon: 'mdi:ruler-square',
  label: 'Unit',
  eleType: 'unit',
  fontFamily: 'roboto-condensed-regular',
}

export const DEFAULT_ICON_CONFIG: IconElementConfig & EDITOR_ELEMENT = {
  ...DEFAULT_DATA_CONFIG,
  icon: 'mdi:image-outline',
  label: 'Icon',
  eleType: 'icon',
  iconFont: 'super-icons',
  iconSize: 42,
  fontFamily: 'roboto-condensed-regular',
}

export const DEFAULT_MOON_CONFIG: MoonElementConfig & EDITOR_ELEMENT = {
  icon: 'mdi:moon-waning-crescent',
  label: 'Moon Phase',
  eleType: 'moon',
  id: '',
  left: base.left,
  top: base.top,
  originX: 'center',
  originY: 'center',
  fill: '#000000',
  fontSize: 42,
  fontFamily: 'weather-regular',
  bgColor: '#ffffff',
}
