import type { LineSunEventsElementConfig } from '@/types/elements/sunEvents'
import { createDefaultSunEventStyles } from '../common/sunEvents.model'

export function decodeLineSunEvents(config: LineSunEventsElementConfig): Record<string, unknown> {
  return {
    ...config,
    eleType: 'lineSunEvents',
    originX: config.originX ?? 'center',
    originY: config.originY ?? 'center',
    phases: (config.phases?.length ? config.phases : createDefaultSunEventStyles()).map((phase) => ({ ...phase })),
    indicator: { ...config.indicator },
  }
}

export function encodeLineSunEvents(element: Record<string, any>): LineSunEventsElementConfig {
  const source = element.__element?.config ?? element
  return {
    id: String(source.id ?? element.id ?? ''), eleType: 'lineSunEvents',
    left: Number(source.left ?? element.left ?? 0), top: Number(source.top ?? element.top ?? 0),
    originX: source.originX ?? element.originX ?? 'center', originY: source.originY ?? element.originY ?? 'center',
    length: Number(source.length ?? 120), strokeWidth: Number(source.strokeWidth ?? 8),
    angle: Number(source.angle ?? element.angle ?? 0),
    phases: (source.phases?.length ? source.phases : createDefaultSunEventStyles()).map((phase: any) => ({ ...phase })),
    indicator: { ...source.indicator },
  }
}
