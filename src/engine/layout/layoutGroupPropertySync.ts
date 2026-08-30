import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useLayoutGroupStore } from '@/stores/layoutGroupStore'
import type { PropertyType } from '@/types/properties'
import * as elementManager from '@/engine/managers/elementManager'
import { resolveMetricPropertyBindingPatch } from '@/elements/common/settings/propertyBinding'
import { reflowLayoutGroup } from './studioLayoutController'
import { syncLayoutGroupProxyBounds } from './layoutGroupSelectionProxy'

export async function syncMetricPropertyBindings(
  propertyKey: string,
  propertyType: PropertyType,
): Promise<number> {
  if (propertyType !== 'data' && propertyType !== 'goal') return 0

  const layoutGroupStore = useLayoutGroupStore()
  const elementDataStore = useElementDataStore()
  const affectedGroupIds = new Set<string>()
  const patches = new Map<string, Record<string, unknown>>()

  for (const snapshot of elementDataStore.elements) {
    const config = snapshot.config as any
    const actualProperty = propertyType === 'goal' ? config.goalProperty : config.dataProperty
    if (String(actualProperty ?? '').trim() !== propertyKey) continue
    const patch = resolveMetricPropertyBindingPatch(config, propertyKey, propertyType)
    if (!patch) continue
    patches.set(snapshot.id, patch)
  }

  for (const group of layoutGroupStore.groups) {
    if (group.members.some((member) => patches.has(member.elementId))) {
      affectedGroupIds.add(group.id)
    }
  }

  await Promise.all(Array.from(patches, ([elementId, patch]) =>
    elementManager.updateElementById(elementId, patch)))

  for (const groupId of affectedGroupIds) {
    reflowLayoutGroup(groupId)
    syncLayoutGroupProxyBounds(groupId)
  }
  if (patches.size > 0) useCanvasStore().canvas?.requestRenderAll?.()
  return patches.size
}
