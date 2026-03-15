import type { FabricElement } from '@/types/element'
import type { HandElementConfig } from '@/types/elements'

export function encodeHand(element: FabricElement): HandElementConfig {
  if (!element) throw new Error('Invalid hand element')

  const hand = element as any

  const config: HandElementConfig = {
    eleType: (hand.eleType as any) || 'hourHand',
    id: String(hand.id ?? ''),
    left: Number(hand.left ?? 0),
    top: Number(hand.top ?? 0),
    originX: (hand.originX as any) ?? 'center',
    originY: (hand.originY as any) ?? 'center',
    angle: Number(hand.angle ?? 0),
    imageUrl: (hand.imageUrl as string) ?? null,
    assetId: (hand.assetId as number | null) ?? null,
    rotationCenter:
      hand.rotationCenter ?? {
        x: Number(hand.left ?? 0),
        y: Number(hand.top ?? 0),
      },
    targetHeight: Number(hand.targetHeight ?? hand.height ?? 0),
    moveDy: Number(hand.moveDy ?? 0),
    height: Number(hand.height ?? 0),
  }

  return config
}

export function decodeHand(config: HandElementConfig): Partial<FabricElement> {
  return {
    eleType: config.eleType as any,
    id: config.id,
    left: config.left,
    top: config.top,
    originX: config.originX as any,
    originY: config.originY as any,
    angle: config.angle,
    imageUrl: config.imageUrl ?? undefined,
    assetId: config.assetId ?? undefined,
  } as Partial<FabricElement>
}
