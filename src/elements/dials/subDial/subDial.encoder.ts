import type { FabricElement } from '@/types/element'
import type { SubDialElementConfig } from '@/types/elements/subDial'
import { subDialSchema } from './subDial.schema'
import { migrateSubDialConfig, type MigratedSubDialConfig } from './subDial.migration'

function finiteOr(value: unknown, fallback: number): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function resolveProgressProperty(live: Record<string, unknown>, stored: Partial<SubDialElementConfig>): string {
  if (hasOwn(live, 'progressProperty') && live.progressProperty !== undefined) return String(live.progressProperty)
  if (hasOwn(stored, 'progressProperty') && stored.progressProperty !== undefined) return String(stored.progressProperty)
  if (hasOwn(live, 'goalProperty') && live.goalProperty !== undefined) return String(live.goalProperty)
  if (hasOwn(stored, 'goalProperty') && stored.goalProperty !== undefined) return String(stored.goalProperty)
  return ''
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
    // Task 4/7 will move remaining consumers to progressProperty. Until then a
    // live legacy binding is accepted as migration input but never persisted.
    progressProperty: resolveProgressProperty(live, stored),
    goalProperty: stored.goalProperty
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
