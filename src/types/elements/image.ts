import type { BaseElementConfig } from './base'

export interface ImageElementConfig extends BaseElementConfig {
  eleType: 'image'
  assetType?: 'image' | 'mask'
  imageUrl?: string
  assetId?: number
  width: number
  height: number
}
