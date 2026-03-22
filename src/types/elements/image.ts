import type { BaseElementConfig } from './base'

export interface ImageElementConfig extends BaseElementConfig {
  eleType: 'image'
  imageUrl?: string
  assetId?: number
  width: number
  height: number
}
