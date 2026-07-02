import type { BaseElementConfig } from './base'

export interface BackgroundElementConfig extends BaseElementConfig {
  eleType: 'background'
  color?: string
  colorProperty?: string
  imageUrl?: string
  imageId?: number | null
  width?: number
  height?: number
}
