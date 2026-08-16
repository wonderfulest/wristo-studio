import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { DynamicImageElementConfig } from '@/types/elements/dynamicImage'

export function encodeDynamicImage(element: FabricElement): DynamicImageElementConfig {
  const value = element as any
  const width = value.frameWidth ?? value.getScaledWidth?.() ?? value.width ?? 1
  const height = value.frameHeight ?? value.getScaledHeight?.() ?? value.height ?? 1
  return {
    eleType: 'dynamicImage', id: String(value.id ?? ''),
    left: Number(value.left ?? 0), top: Number(value.top ?? 0),
    originX: value.originX ?? 'center', originY: value.originY ?? 'center',
    width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)),
    items: structuredClone(value.items ?? []),
  }
}

export function decodeDynamicImage(config: DynamicImageElementConfig): Partial<FabricElement> {
  return {
    ...structuredClone(config),
    id: config.id || nanoid(),
    items: config.items ?? [],
  } as Partial<FabricElement>
}
