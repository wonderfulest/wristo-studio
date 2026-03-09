import type { FabricElement } from '@/types/element'
import type { MoonElementConfig } from '@/types/elements/data'

export function encodeMoon(element: FabricElement): MoonElementConfig {
  const imageUrl = (element as unknown as { moonImageUrl?: string }).moonImageUrl
  const width = (element as unknown as { width?: number }).width
  const height = (element as unknown as { height?: number }).height

  return {
    eleType: 'moon',
    id: String(element.id ?? ''),
    left: Number(element.left),
    top: Number(element.top),
    originX: 'center',
    originY: 'center',
    imageUrl,
    width,
    height,
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
