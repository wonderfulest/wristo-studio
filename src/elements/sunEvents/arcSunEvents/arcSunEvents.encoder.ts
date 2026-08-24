import type { ArcSunEventsElementConfig } from '@/types/elements/sunEvents'
import { createDefaultSunEventStyles } from '../common/sunEvents.model'
import { DEFAULT_SUN_EVENTS_SIMPLE_COLOR, normalizeSunEventIndicator } from '../common/sunEvents.defaults'

export function decodeArcSunEvents(config: ArcSunEventsElementConfig): Record<string, unknown> {
  return {
    ...config,
    eleType: 'arcSunEvents',
    originX: config.originX ?? 'center',
    originY: config.originY ?? 'center',
    displayMode: config.displayMode === 'simple' ? 'simple' : 'phases',
    simpleColor: String(config.simpleColor || DEFAULT_SUN_EVENTS_SIMPLE_COLOR),
    phases: (config.phases?.length ? config.phases : createDefaultSunEventStyles()).map((phase) => ({ ...phase })),
    indicator: normalizeSunEventIndicator(config.indicator),
  }
}

export function encodeArcSunEvents(element: Record<string, any>): ArcSunEventsElementConfig {
  const source = element.__element?.config ?? element
  const left = Number(element.left ?? source.left ?? 0)
  const top = Number(element.top ?? source.top ?? 0)
  const centerOffset = element.__sunEventsCenterOffset
  const offsetX = Number(centerOffset?.x)
  const offsetY = Number(centerOffset?.y)
  const sourceCenterX = Number(source.centerX)
  const sourceCenterY = Number(source.centerY)
  const center = Number.isFinite(offsetX) && Number.isFinite(offsetY)
    ? { centerX: left + offsetX, centerY: top + offsetY }
    : Number.isFinite(sourceCenterX) && Number.isFinite(sourceCenterY)
      ? { centerX: sourceCenterX, centerY: sourceCenterY }
      : {}
  return {
    id: String(source.id ?? element.id ?? ''), eleType: 'arcSunEvents',
    left, top, ...center,
    originX: source.originX ?? element.originX ?? 'center', originY: source.originY ?? element.originY ?? 'center',
    radius: Number(source.radius ?? 50), strokeWidth: Number(source.strokeWidth ?? 6),
    startAngle: Number(source.startAngle ?? 90), angleRange: Number(source.angleRange ?? 360),
    counterClockwise: Boolean(source.counterClockwise),
    displayMode: source.displayMode === 'simple' ? 'simple' : 'phases',
    simpleColor: String(source.simpleColor || DEFAULT_SUN_EVENTS_SIMPLE_COLOR),
    phases: (source.phases?.length ? source.phases : createDefaultSunEventStyles()).map((phase: any) => ({ ...phase })),
    indicator: normalizeSunEventIndicator(source.indicator),
  }
}
