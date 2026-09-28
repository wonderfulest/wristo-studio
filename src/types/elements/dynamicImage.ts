import type { TypedExpression } from '@/engine/expression/types'
import type { BaseElementConfig } from './base'

export interface DynamicImageAsset {
  imageUrl: string
  assetId?: number
}

export interface DynamicImageItem extends DynamicImageAsset {
  id: string
  /** Inclusive lower progress threshold, 0..1, when bound to a goal. */
  minProgress?: number
  expression?: TypedExpression
}

export interface DynamicImageElementConfig extends BaseElementConfig {
  eleType: 'dynamicImage'
  selectionMode?: 'expression' | 'goalProgress'
  goalProperty?: string
  /** Editor preview only; devices use the selected goal value and target. */
  progress?: number
  width: number
  height: number
  rotation?: number
  items: DynamicImageItem[]
}
