import type { FabricElement } from '@/types/element'
import type { BackgroundElementConfig } from '@/types/elements/background'
import { nanoid } from 'nanoid'

export function encodeBackground(element: FabricElement): BackgroundElementConfig {
  return {
    eleType: 'background',
    id: String((element as any).id ?? ''),
    left: Number((element as any).left ?? 0),
    top: Number((element as any).top ?? 0),
    originX: ((element as any).originX ?? 'center') as any,
    originY: ((element as any).originY ?? 'center') as any,
    imageUrl: (element as any).wristoImageUrl ?? (element as any).imageUrl ?? (typeof (element as any).getSrc === 'function' ? (element as any).getSrc() : undefined),
    imageId: (element as any).wristoImageId ?? (element as any).imageId ?? null,
  }
}

export function decodeBackground(config: BackgroundElementConfig): Partial<FabricElement> {
  return {
    eleType: 'background',
    id: config.id ?? nanoid(),
    left: config.left,
    top: config.top,
    originX: config.originX,
    originY: config.originY,
    wristoImageUrl: config.imageUrl,
    wristoImageId: config.imageId ?? null,
  } as Partial<FabricElement>
}
