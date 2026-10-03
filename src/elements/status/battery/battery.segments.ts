import { Group, Rect } from 'fabric'
import type { BatteryElementConfig } from '@/types/elements/battery'

export function normalizeBatterySegments(config: Pick<BatteryElementConfig, 'segmentMode' | 'segments' | 'segmentGap'>) {
  return {
    segmentMode: config.segmentMode === true,
    segments: Number.isFinite(config.segments) ? Math.min(50, Math.max(1, Math.round(config.segments!))) : 5,
    // Gaps are physical dimensions: preserve fractional / enlarged values after
    // design-size conversion. Only the drawable geometry limits the effective gap.
    segmentGap: Number.isFinite(config.segmentGap) ? Math.max(0, config.segmentGap!) : 2,
  }
}

// Mask the continuous level so encoding still records the exact charge, including
// when its edge lies in a gap. The mask is relative to the level rectangle center.
export function createBatterySegmentClip(config: BatteryElementConfig, levelWidth: number, levelHeight: number) {
  const { segmentMode, segments, segmentGap } = normalizeBatterySegments(config)
  if (!segmentMode) return undefined
  const innerWidth = Math.max(0, (config.width ?? 28) - (config.padding ?? 2) * 2)
  const innerHeight = Math.max(0, (config.height ?? 18) - (config.padding ?? 2) * 2)
  const vertical = config.orientation === 'vertical'
  const length = vertical ? innerHeight : innerWidth
  const gap = segments > 1 ? Math.min(segmentGap, Math.max(0, (length - segments) / (segments - 1))) : 0
  const size = (length - gap * (segments - 1)) / segments
  const slots = Array.from({ length: segments }, (_, index) => new Rect({
    left: vertical ? 0 : index * (size + gap),
    top: vertical ? index * (size + gap) : 0,
    width: vertical ? innerWidth : size,
    height: vertical ? size : innerHeight,
    strokeWidth: 0,
    fill: '#000000',
  }))
  return new Group(slots, {
    originX: 'center', originY: 'center',
    left: vertical ? 0 : (innerWidth - levelWidth) / 2,
    top: vertical ? -(innerHeight - levelHeight) / 2 : 0,
  })
}
