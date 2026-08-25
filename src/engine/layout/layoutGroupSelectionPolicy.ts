import type { HorizontalLayoutGroupConfig } from '@/types/layoutGroup'

type SelectableObject = {
  id?: unknown
  eleType?: unknown
  layoutGroupId?: unknown
}

export type AtomicLayoutSelectionDecision<T> =
  | { kind: 'unchanged' }
  | { kind: 'replace'; objects: T[]; groupIds: string[] }

const normalizedId = (value: unknown): string => String(value ?? '').trim()

/**
 * Layout groups are atomic during marquee selection: their members must never
 * remain inside the same Fabric ActiveSelection as ordinary elements.
 */
export function resolveAtomicLayoutSelection<T extends SelectableObject>(
  objects: readonly T[],
  groups: readonly HorizontalLayoutGroupConfig[],
): AtomicLayoutSelectionDecision<T> {
  if (objects.length === 1 && String(objects[0]?.eleType ?? '') === 'layoutGroupProxy') {
    return { kind: 'unchanged' }
  }

  const groupIdByMemberId = new Map<string, string>()
  groups.forEach((group) => {
    group.members.forEach((member) => {
      const elementId = normalizedId(member.elementId)
      if (elementId) groupIdByMemberId.set(elementId, group.id)
    })
  })

  const groupIds = new Set<string>()
  const ordinaryObjects: T[] = []
  let containsLayoutGroupObject = false

  objects.forEach((object) => {
    if (String(object.eleType ?? '') === 'layoutGroupProxy') {
      containsLayoutGroupObject = true
      const groupId = normalizedId(object.layoutGroupId)
      if (groupId) groupIds.add(groupId)
      return
    }

    const groupId = groupIdByMemberId.get(normalizedId(object.id))
    if (groupId) {
      containsLayoutGroupObject = true
      groupIds.add(groupId)
      return
    }
    ordinaryObjects.push(object)
  })

  if (!containsLayoutGroupObject) return { kind: 'unchanged' }
  return {
    kind: 'replace',
    objects: ordinaryObjects,
    groupIds: [...groupIds],
  }
}
