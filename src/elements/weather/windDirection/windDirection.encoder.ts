import type { FabricElement } from '@/types/element'
import type { WindDirectionElementConfig } from '@/types/elements/data'
import { nanoid } from 'nanoid'

export function encodeWindDirection(element: FabricElement): WindDirectionElementConfig {
  const width = (element as unknown as { windWidth?: number }).windWidth ?? (element as unknown as { width?: number }).width
  const height = (element as unknown as { windHeight?: number }).windHeight ?? (element as unknown as { height?: number }).height
  const windDegree = (element as unknown as { windDegree?: number }).windDegree ?? (element.angle ?? 0)
  const assetId = (element as unknown as { assetId?: number }).assetId
  const color = (element as unknown as { color?: string }).color
  const imageSvg = (element as unknown as { imageSvg?: string }).imageSvg
  const imageUrl = (element as unknown as { imageUrl?: string }).imageUrl

  return {
    eleType: 'windDirection',
    id: String(element.id ?? ''),
    left: Number(element.left),
    top: Number(element.top),
    originX: 'center',
    originY: 'center',
    imageUrl,
    imageSvg,
    width,
    height,
    windDegree,
    assetId,
    color,
  }
}

export function decodeWindDirection(config: WindDirectionElementConfig): Partial<FabricElement> {
  return {
    eleType: 'windDirection',
    id: config.id ?? nanoid(),
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: config.originY,
    imageUrl: config.imageUrl,
    imageSvg: config.imageSvg,
    width: config.width,
    height: config.height,
    windDegree: config.windDegree,
    assetId: config.assetId,
    color: config.color,
  } as Partial<FabricElement>
}
