import type { FabricElement } from '@/types/element'
import type { DialElementConfig, DialType } from './dial.schema'

function getNumber(value: unknown, fallback: number): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function encodeDial(element: FabricElement, type: DialType): DialElementConfig {
  if (!element) throw new Error('Invalid element')

  const anyElement = element as any
  const width = getNumber(anyElement.width, 0)
  const height = getNumber(anyElement.height, 0)
  const renderedWidth = width * getNumber(anyElement.scaleX, 1)
  const renderedHeight = height * getNumber(anyElement.scaleY, 1)
  const baseSize = getNumber(anyElement.dialBaseSize, 0)
  const scaleFactor = baseSize > 0 ? Math.max(renderedWidth, renderedHeight) / baseSize : getNumber(anyElement.scaleFactor, 1)

  return {
    id: anyElement.id,
    eleType: type,
    left: anyElement.left,
    top: anyElement.top,
    originX: anyElement.originX,
    originY: anyElement.originY,
    height: anyElement.height,
    fill: anyElement.fill,
    fillProperty: anyElement.fillProperty,
    imageUrl: anyElement.imageUrl ?? null,
    assetId: anyElement.assetId ?? null,
    scaleFactor: Number.isFinite(scaleFactor) && scaleFactor > 0 ? Number(scaleFactor.toFixed(4)) : 1,
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
    fillProperty: config.fillProperty,
    imageUrl: config.imageUrl,
    assetId: config.assetId,
    scaleFactor: config.scaleFactor,
  }

  return result
}
