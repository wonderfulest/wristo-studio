import type { CurveSunEventsElementConfig } from '@/types/elements/sunEvents'
import { createDefaultSunEventStyles } from '../common/sunEvents.model'

export function decodeCurveSunEvents(config: CurveSunEventsElementConfig): Record<string, unknown> {
  return {
    ...config,
    eleType: 'curveSunEvents',
    originX: config.originX ?? 'center',
    originY: config.originY ?? 'center',
    phases: (config.phases?.length ? config.phases : createDefaultSunEventStyles()).map((phase) => ({ ...phase })),
    indicator: { ...config.indicator },
  }
}

export function encodeCurveSunEvents(element: Record<string, any>): CurveSunEventsElementConfig {
  const source = element.__element?.config ?? element
  return {
    id: String(source.id ?? element.id ?? ''),
    eleType: 'curveSunEvents',
    left: Number(element.left ?? source.left ?? 0),
    top: Number(element.top ?? source.top ?? 0),
    originX: source.originX ?? element.originX ?? 'center',
    originY: source.originY ?? element.originY ?? 'center',
    width: Number(source.width ?? 180),
    height: Number(source.height ?? 60),
    strokeWidth: Number(source.strokeWidth ?? 6),
    angle: Number(element.angle ?? source.angle ?? 0),
    phases: (source.phases?.length ? source.phases : createDefaultSunEventStyles()).map((phase: any) => ({ ...phase })),
    indicator: {
      ...source.indicator,
      normalOffset: Number(source.indicator?.normalOffset ?? 0),
      orientation: source.indicator?.orientation === 'tangent' ? 'tangent' : 'fixed',
    },
  }
}
