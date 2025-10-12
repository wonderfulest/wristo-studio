import type { BaseElementConfig } from './base'
import type { FabricFill } from '@/types/fabric'

export interface BaseTextConfig extends BaseElementConfig {
  fontSize: number
  fill: FabricFill
  fontFamily: string
  originX: 'left' | 'center' | 'right'
  originY: 'top' | 'center' | 'bottom'
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

export interface MoonElementConfig extends BaseElementConfig {
  eleType: 'moon'
  // image-based rendering
  imageUrl?: string
  width?: number
  height?: number
}