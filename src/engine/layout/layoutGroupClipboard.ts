import type { HorizontalLayoutGroupConfig } from '@/types/layoutGroup'

export function remapLayoutGroupForPaste(
  group: HorizontalLayoutGroupConfig,
  memberIdMap: ReadonlyMap<string, string>,
  newGroupId: string,
  offsetX: number,
  offsetY: number,
): HorizontalLayoutGroupConfig {
  return {
    ...group,
    id: newGroupId,
    name: `${group.name} Copy`,
    left: group.left + offsetX,
    top: group.top + offsetY,
    members: group.members.map((member) => {
      const nextId = memberIdMap.get(member.elementId)
      if (!nextId) throw new Error(`Missing pasted element id for layout member "${member.elementId}"`)
      return { ...member, elementId: nextId }
    }),
  }
}
