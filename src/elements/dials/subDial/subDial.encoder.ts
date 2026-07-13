import type { FabricElement } from '@/types/element'
import type { SubDialElementConfig } from '@/types/elements/subDial'
import { subDialSchema } from './subDial.schema'
import { migrateSubDialConfig, type MigratedSubDialConfig } from './subDial.migration'

function finiteOr(value: unknown, fallback: number): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function encodeSubDial(element: Partial<FabricElement>): MigratedSubDialConfig {
  const live = element as any
  const stored = (live.__element?.config ?? {}) as Partial<SubDialElementConfig>
  const defaults = subDialSchema.defaultConfig
  const baseRadius = finiteOr(stored.radius, defaults.radius)
  const scale = Math.abs(finiteOr(live.scaleX, 1))

  return migrateSubDialConfig({
    ...stored,
    id: String(live.id ?? stored.id ?? ''),
    eleType: 'subDial',
    left: finiteOr(live.left, finiteOr(stored.left, defaults.left)),
    top: finiteOr(live.top, finiteOr(stored.top, defaults.top)),
    rotation: finiteOr(live.angle, finiteOr(stored.rotation, defaults.rotation)),
    radius: baseRadius * scale,
    originX: live.originX ?? stored.originX ?? defaults.originX,
    originY: live.originY ?? stored.originY ?? defaults.originY,
    dialProperty: Object.prototype.hasOwnProperty.call(live, 'dialProperty')
      ? String(live.dialProperty ?? '')
      : String(stored.dialProperty ?? '')
  })
}

export function decodeSubDial(config: SubDialElementConfig): Partial<FabricElement> {
  const migrated = migrateSubDialConfig(config as any)
  return {
    ...migrated,
    eleType: 'subDial',
    left: migrated.left,
    top: migrated.top,
    angle: migrated.rotation,
    scaleX: 1,
    scaleY: 1
  } as Partial<FabricElement>
}
