import type { FabricElement } from '@/types/element'
import type { RotatingHandElementConfig } from '@/types/elements'
import { resolveRotatingHandAngle, resolveRotatingHandDirectionAngle, toRotatingHandRenderAngle } from './rotatingHand.math'

export function encodeRotatingHand(element: FabricElement): RotatingHandElementConfig {
  const hand = element as any
  const centerX = Number(hand.centerX ?? hand.left ?? 0)
  const centerY = Number(hand.centerY ?? hand.top ?? 0)
  return {
    id: String(hand.id ?? ''),
    eleType: 'rotatingHand',
    left: centerX,
    top: centerY,
    originX: hand.originX ?? 'center',
    originY: hand.originY ?? 'center',
    dialProperty: String(hand.dialProperty ?? ''),
    progressMode: hand.progressMode === 'goal' || hand.progressMode === 'direction' ? hand.progressMode : 'range',
    previewProgress: Number(hand.previewProgress ?? 50),
    previewBearing: Number(hand.previewBearing ?? 0),
    northAngle: Number(hand.northAngle ?? 270),
    startAngle: Number(hand.startAngle ?? 150),
    endAngle: Number(hand.endAngle ?? 390),
    counterClockwise: Boolean(hand.counterClockwise),
    outOfRangeBehavior: hand.outOfRangeBehavior === 'hide' ? 'hide' : 'clamp',
    assetId: hand.assetId == null ? null : Number(hand.assetId),
    imageUrl: hand.imageUrl == null ? null : String(hand.imageUrl),
    centerX,
    centerY,
    pivotOffsetX: Number(hand.pivotOffsetX ?? 0),
    pivotOffsetY: Number(hand.pivotOffsetY ?? 0),
    scalePercent: Number(hand.scalePercent ?? 100),
  }
}

export function decodeRotatingHand(config: RotatingHandElementConfig): Partial<FabricElement> {
  const configuredAngle = config.progressMode === 'direction'
    ? resolveRotatingHandDirectionAngle(Number(config.previewBearing ?? 0), {
        northAngle: Number(config.northAngle ?? 270),
        counterClockwise: config.counterClockwise,
      }) ?? Number(config.northAngle ?? 270)
    : resolveRotatingHandAngle(config.previewProgress / 100, config) ?? config.startAngle
  const angle = toRotatingHandRenderAngle(configuredAngle)
  return {
    ...config,
    eleType: 'rotatingHand',
    left: config.centerX ?? config.left,
    top: config.centerY ?? config.top,
    angle,
  } as Partial<FabricElement>
}
