import type { FabricElement } from '@/types/element'
import type { ImageElementConfig } from '@/types/elements/image'
import { nanoid } from 'nanoid'

export function encodeImage(element: FabricElement): ImageElementConfig {
  const scaledWidth = (element as unknown as { getScaledWidth?: () => number }).getScaledWidth?.()
  const scaledHeight = (element as unknown as { getScaledHeight?: () => number }).getScaledHeight?.()

  const rawW = Number((element as unknown as { width?: number }).width ?? 0)
  const rawH = Number((element as unknown as { height?: number }).height ?? 0)
  const sx = Number((element as unknown as { scaleX?: number }).scaleX ?? 1)
  const sy = Number((element as unknown as { scaleY?: number }).scaleY ?? 1)

  const width = Number.isFinite(scaledWidth as number) ? Number(scaledWidth) : rawW * sx
  const height = Number.isFinite(scaledHeight as number) ? Number(scaledHeight) : rawH * sy

  return {
    eleType: 'image',
    id: String((element as any).id ?? ''),
    left: Number((element as any).left ?? 0),
    top: Number((element as any).top ?? 0),
    originX: ((element as any).originX ?? 'center') as any,
    originY: ((element as any).originY ?? 'center') as any,
    imageUrl: (element as any).imageUrl,
    assetId: (element as any).assetId,
    width: Math.max(1, Math.round(Number.isFinite(width) ? width : 1)),
    height: Math.max(1, Math.round(Number.isFinite(height) ? height : 1)),
  }
}

export function decodeImage(config: ImageElementConfig): Partial<FabricElement> {
  return {
    eleType: 'image',
    id: config.id ?? nanoid(),
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: config.originY,
    imageUrl: config.imageUrl,
    assetId: config.assetId,
    width: config.width,
    height: config.height,
  } as Partial<FabricElement>
}
