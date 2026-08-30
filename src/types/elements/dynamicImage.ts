import type { TypedExpression } from '@/engine/expression/types'
import type { BaseElementConfig } from './base'

export interface DynamicImageAsset {
  imageUrl: string
  assetId?: number
}

export interface DynamicImageItem extends DynamicImageAsset {
  id: string
  expression: TypedExpression
}

export interface DynamicImageElementConfig extends BaseElementConfig {
  eleType: 'dynamicImage'
  width: number
  height: number
  rotation?: number
  items: DynamicImageItem[]
}
