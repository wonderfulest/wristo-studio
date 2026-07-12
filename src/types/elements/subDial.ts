import type { BaseElementConfig } from './base'

export type SubDialProgressMode = 'auto' | 'goal' | 'range' | 'custom'
export type SubDialContentKey = 'icon' | 'label' | 'value' | 'unit' | 'goalValue' | 'percentage'

export interface SubDialContentBaseConfig {
  visible: boolean
  x: number
  y: number
  rotation: number
  scale: number
}

export interface SubDialTextItemConfig extends SubDialContentBaseConfig {
  color: string
  font: string
  fontSize: number
  textAlign: 'left' | 'center' | 'right'
  prefix: string
  suffix: string
  decimals: number
}

export interface SubDialIconItemConfig extends SubDialContentBaseConfig {
  displayType: 'auto' | 'mip' | 'amoled'
  color: string
  size: number
}

export interface SubDialContentConfig {
  icon: SubDialIconItemConfig
  label: SubDialTextItemConfig
  value: SubDialTextItemConfig
  unit: SubDialTextItemConfig
  goalValue: SubDialTextItemConfig
  percentage: SubDialTextItemConfig
}

export type SubDialRangeMode = 'percentage' | 'custom'
export type SubDialOutOfRangeBehavior = 'clamp' | 'hide'
export type SubDialPointerStyle = 'line' | 'triangle' | 'image'

export interface SubDialPointerConfig {
  style: SubDialPointerStyle
  color: string
  width: number
  lengthRatio: number
  assetId: string | null
  imageUrl: string | null
  pivotX: number
  pivotY: number
  scale: number
  rotationOffset: number
  tintColor: string | null
}

export interface SubDialElementConfig extends BaseElementConfig {
  eleType: 'subDial'
  radius: number
  rotation: number
  /** @deprecated Temporary live-layer compatibility; persisted configs use progressProperty. */
  goalProperty?: string
  progressProperty: string
  progressMode: SubDialProgressMode
  customMin: number
  customMax: number
  content: SubDialContentConfig
  rangeMode: SubDialRangeMode
  minValue: number
  maxValue: number
  previewValue: number
  outOfRangeBehavior: SubDialOutOfRangeBehavior
  startAngle: number
  endAngle: number
  counterClockwise: boolean
  majorTicks: number
  minorTicks: number
  showMajorTicks: boolean
  showMinorTicks: boolean
  showTickLabels: boolean
  showEndpointTicks: boolean
  majorTickColor: string
  minorTickColor: string
  pointer: SubDialPointerConfig
  showCenterCap: boolean
  centerCapColor: string
  centerCapRadius: number
  backgroundColor: string
  backgroundOpacity: number
  /** @deprecated Migrated to content.value.visible. */
  showValue?: boolean
  /** @deprecated Migrated to content.unit.visible. */
  showUnit?: boolean
  /** @deprecated Migrated to content.unit.suffix. */
  unit?: string
  /** @deprecated Migrated to content.value.decimals. */
  decimals?: number
  /** @deprecated Migrated to content.value.color. */
  valueColor?: string
  /** @deprecated Migrated to content.value.fontSize. */
  valueFontSize?: number
}
