import type { FabricElement } from '@/types/element'

export interface DialElementConfig {
  id?: string
  eleType?: 'romans'
  imageUrl: string | null
  assetId: number | null
  fill?: string
  left?: number
  top?: number
  originX?: FabricElement['originX']
  originY?: FabricElement['originY']
  height?: number
}

export function encodeRomans(element: FabricElement): DialElementConfig {
  if (!element) throw new Error('Invalid element')

  return {
    id: (element as any).id,
    eleType: 'romans',
    left: (element as any).left,
    top: (element as any).top,
    originX: (element as any).originX,
    originY: (element as any).originY,
    height: (element as any).height,
    fill: (element as any).fill,
    imageUrl: (element as any).imageUrl ?? null,
    assetId: (element as any).assetId ?? null,
  }
}

export function decodeRomans(config: DialElementConfig): Partial<FabricElement> {
  return {
    id: config.id,
    eleType: 'romans',
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: config.originY,
    height: config.height,
    fill: config.fill,
    imageUrl: config.imageUrl,
    assetId: config.assetId,
  } as any
}

