import type { FabricElement } from '@/types/element'
import type { SubDialContentConfig, SubDialElementConfig } from '@/types/elements/subDial'
import { subDialSchema } from './subDial.schema'

function finiteOr(value: unknown, fallback: number): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function encodeSubDial(element: Partial<FabricElement>): SubDialElementConfig {
  const live = element as any
  const stored = (live.__element?.config ?? {}) as Partial<SubDialElementConfig>
  const defaults = subDialSchema.defaultConfig
  const storedContent: Partial<SubDialContentConfig> = stored.content ?? {}
  const baseRadius = finiteOr(stored.radius, defaults.radius)
  const scale = Math.abs(finiteOr(live.scaleX, 1))

  return {
    ...defaults,
    ...stored,
    id: String(live.id ?? stored.id ?? ''),
    eleType: 'subDial',
    left: finiteOr(live.left, finiteOr(stored.left, defaults.left)),
    top: finiteOr(live.top, finiteOr(stored.top, defaults.top)),
    rotation: finiteOr(live.angle, finiteOr(stored.rotation, defaults.rotation)),
    radius: baseRadius * scale,
    originX: live.originX ?? stored.originX ?? defaults.originX,
    originY: live.originY ?? stored.originY ?? defaults.originY,
    goalProperty: String(live.goalProperty ?? stored.goalProperty ?? defaults.goalProperty),
    content: {
      icon: { ...defaults.content.icon, ...storedContent.icon },
      label: { ...defaults.content.label, ...storedContent.label },
      value: { ...defaults.content.value, ...storedContent.value },
      unit: { ...defaults.content.unit, ...storedContent.unit },
      goalValue: { ...defaults.content.goalValue, ...storedContent.goalValue },
      percentage: { ...defaults.content.percentage, ...storedContent.percentage }
    },
    pointer: {
      ...defaults.pointer,
      ...stored.pointer
    }
  }
}

export function decodeSubDial(config: SubDialElementConfig): Partial<FabricElement> {
  return {
    ...(config as any),
    eleType: 'subDial',
    left: config.left,
    top: config.top,
    angle: config.rotation,
    scaleX: 1,
    scaleY: 1
  } as Partial<FabricElement>
}
