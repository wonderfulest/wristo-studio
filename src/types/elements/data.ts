import type { BaseElementConfig } from './base'
import type { FabricFill } from '@/types/fabric'
import type { ZoneMetricDisplayMode, ZoneMetricPreset, ZoneMetricZone } from '@/elements/metric/zoneMetric/zoneMetric.common'

export interface BaseTextConfig extends BaseElementConfig {
  fontSize: number
  fill: FabricFill
  fontFamily: string
  originX: 'left' | 'center' | 'right'
  originY: 'center'
  topBase?: number
}

export interface DataElementConfig extends BaseTextConfig {
  eleType: 'data' | 'icon' | 'label' | 'unit'
  metricSymbol: string
  metricValue?: string
  dataProperty?: string
  goalProperty?: string
}

export interface IconElementConfig extends DataElementConfig {
  eleType: 'icon'
  iconFont: string
  iconSize: number
}

export interface LabelElementConfig extends DataElementConfig {
  eleType: 'label'
  text: string
}

export interface UnitElementConfig extends DataElementConfig {
  eleType: 'unit'
}

export interface ZoneMetricElementConfig extends BaseElementConfig {
  eleType: 'zoneMetric'
  width: number
  height: number
  dataProperty?: string
  displayMode: ZoneMetricDisplayMode
  zonePreset: ZoneMetricPreset
  value: number
  unit: string
  label: string
  zoneLabel?: string
  showLabel: boolean
  showValue: boolean
  showUnit: boolean
  showZoneLabel: boolean
  fill: string
  textColor: string
  mutedTextColor: string
  inactiveColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
  ringThickness: number
  gap: number
  zones?: ZoneMetricZone[]
}

export interface MoonElementConfig extends BaseElementConfig {
  eleType: 'moon'
  // image-based rendering
  imageUrl?: string
  width?: number
  height?: number
}

export interface WeatherElementConfig extends BaseElementConfig {
  eleType: 'weather'
  weatherDisplayType?: 'mip' | 'amoled'
  // AMOLED image-based rendering
  amoledImageUrl?: string
  amoledIconUnicode?: string
  width?: number
  height?: number

  // MIP font-based rendering
  mipUnicode?: string
  fontFamily?: string
  fill?: string
  fontSize?: number

  // legacy
  imageUrl?: string
}

export interface WindDirectionElementConfig extends BaseElementConfig {
  eleType: 'windDirection'
  imageUrl?: string
  imageSvg?: string
  width?: number
  height?: number
  windDegree?: number
  assetId?: number
  color?: string
}
