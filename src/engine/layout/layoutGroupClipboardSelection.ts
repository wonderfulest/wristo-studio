import type { HorizontalLayoutGroupConfig } from '@/types/layoutGroup'

type ClipboardSelectable = {
  id?: unknown
  eleType?: unknown
}

export function resolveLayoutGroupClipboardSelection<T extends ClipboardSelectable>(
  activeObjects: readonly T[],
  canvasObjects: readonly T[],
  activeLayoutGroupIds: readonly string[],
  layoutGroups: readonly HorizontalLayoutGroupConfig[],
): { objects: T[]; layoutGroups: HorizontalLayoutGroupConfig[] } {
  const selectedGroups = activeLayoutGroupIds
    .map((groupId) => layoutGroups.find((group) => group.id === groupId))
    .filter((group): group is HorizontalLayoutGroupConfig => Boolean(group))
  const canvasObjectById = new Map(
    canvasObjects.map((object) => [String(object.id ?? ''), object]),
  )
  const objects: T[] = []
  const addedIds = new Set<string>()

  const append = (object: T | undefined) => {
    if (!object || String(object.eleType ?? '') === 'layoutGroupProxy') return
    const id = String(object.id ?? '')
    if (!id || addedIds.has(id)) return
    addedIds.add(id)
    objects.push(object)
  }

  activeObjects.forEach(append)
  selectedGroups.forEach((group) => {
    group.members.forEach((member) => append(canvasObjectById.get(member.elementId)))
  })

  return { objects, layoutGroups: selectedGroups }
}
