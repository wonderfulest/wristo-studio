import type { FabricElement } from '@/types/element'

export interface CenterCapElementConfig {
  id?: string
  eleType?: 'centerCap'
  imageUrl: string | null
  assetId: number | null
  fill?: string
  left?: number
  top?: number
  originX?: FabricElement['originX']
  originY?: FabricElement['originY']
  height?: number
  targetSize?: number
}

export function encodeCenterCap(element: FabricElement): CenterCapElementConfig {
  const anyEl = element as any
  const renderedWidth = (anyEl.width || 0) * (anyEl.scaleX || 1)
  const renderedHeight = (anyEl.height || 0) * (anyEl.scaleY || 1)
  const targetSize = Math.max(renderedWidth, renderedHeight)

  return {
    id: anyEl.id,
    eleType: 'centerCap',
    left: anyEl.left,
    top: anyEl.top,
    originX: anyEl.originX,
    originY: anyEl.originY,
    height: anyEl.height,
    fill: anyEl.fill,
    imageUrl: anyEl.imageUrl ?? null,
    assetId: anyEl.assetId ?? null,
    targetSize,
  }
}

export function decodeCenterCap(config: CenterCapElementConfig): Partial<FabricElement> {
  return {
    id: config.id,
    eleType: 'centerCap',
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: config.originY,
    height: config.height,
    fill: config.fill,
    imageUrl: config.imageUrl,
    assetId: config.assetId,
    targetSize: config.targetSize,
  } as Partial<FabricElement>
}
