import type { FabricElement } from '@/types/element'
import type { DialElementConfig, DialType } from './dial.schema'

export function encodeDial(element: FabricElement, type: DialType): DialElementConfig {
  if (!element) throw new Error('Invalid element')

  const anyElement = element as any

  return {
    id: anyElement.id,
    eleType: type,
    left: anyElement.left,
    top: anyElement.top,
    originX: anyElement.originX,
    originY: anyElement.originY,
    height: anyElement.height,
    fill: anyElement.fill,
    imageUrl: anyElement.imageUrl ?? null,
    assetId: anyElement.assetId ?? null,
  }
}

export function decodeDial(config: DialElementConfig): Partial<FabricElement> {
  const result: Partial<FabricElement> = {
    id: config.id,
    eleType: config.eleType,
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: config.originY,
    height: config.height,
    fill: config.fill,
    imageUrl: config.imageUrl,
    assetId: config.assetId,
  }

  return result
}
