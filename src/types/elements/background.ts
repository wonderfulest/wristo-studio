import type { BaseElementConfig } from './base'

export interface BackgroundElementConfig extends BaseElementConfig {
  eleType: 'background'
  imageUrl?: string
  imageId?: number | null
}
