import type { FabricElement } from '@/types/element'

export type DialType = 'romans' | 'tick12' | 'tick60'

export interface DialElementConfig {
  id?: string
  eleType?: DialType
  imageUrl: string | null
  assetId: number | null
  fill?: string
  left?: number
  top?: number
  originX?: FabricElement['originX']
  originY?: FabricElement['originY']
  height?: number
}
