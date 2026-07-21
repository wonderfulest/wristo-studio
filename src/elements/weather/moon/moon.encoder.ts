import type { FabricElement } from '@/types/element'
import type { MoonElementConfig } from '@/types/elements/data'

export function encodeMoon(element: FabricElement): MoonElementConfig {
  const imageUrl = (element as unknown as { moonImageUrl?: string }).moonImageUrl
  const width = Number((element as unknown as { width?: number }).width)
  const height = Number((element as unknown as { height?: number }).height)
  const scaleX = Number((element as unknown as { scaleX?: number }).scaleX ?? 1)
  const scaleY = Number((element as unknown as { scaleY?: number }).scaleY ?? 1)
  const renderedWidth = Number.isFinite(width) ? Math.max(1, Math.round(width * scaleX)) : undefined
  const renderedHeight = Number.isFinite(height) ? Math.max(1, Math.round(height * scaleY)) : undefined

  return {
    eleType: 'moon',
    id: String(element.id ?? ''),
    left: Number(element.left),
    top: Number(element.top),
    originX: 'center',
    originY: 'center',
    imageUrl,
    width: renderedWidth,
    height: renderedHeight,
  }
}

export function decodeMoon(config: MoonElementConfig): Partial<FabricElement> {
  return {
    eleType: 'moon',
    id: config.id,
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: config.originY,
    imageUrl: config.imageUrl,
    width: config.width,
    height: config.height,
  } as Partial<FabricElement>
}
