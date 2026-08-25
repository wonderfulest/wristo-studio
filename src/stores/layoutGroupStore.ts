import { defineStore } from 'pinia'
import type { AnyElementConfig } from '@/types/elements'
import type {
  HorizontalLayoutGroupConfig,
  HorizontalLayoutMemberConfig,
} from '@/types/layoutGroup'
import { normalizeAndValidateLayoutGroups } from '@/engine/layout/layoutGroupValidation'
import { useElementDataStore } from '@/stores/elementDataStore'

export interface RemoveLayoutMemberResult {
  group: HorizontalLayoutGroupConfig | null
  autoDissolved: boolean
  remainingElementIds: string[]
}

const cloneGroups = (groups: readonly HorizontalLayoutGroupConfig[]): HorizontalLayoutGroupConfig[] =>
  groups.map((group) => ({
    ...group,
    members: group.members.map((member) => ({ ...member })),
  }))

export const useLayoutGroupStore = defineStore('layoutGroups', {
  state: () => ({
    groups: [] as HorizontalLayoutGroupConfig[],
  }),

  actions: {
    currentElements(): AnyElementConfig[] {
      return useElementDataStore().elements.map((snapshot) => snapshot.config)
    },

    replaceValidated(nextGroups: unknown, elements?: readonly AnyElementConfig[]): void {
      this.groups = normalizeAndValidateLayoutGroups(nextGroups, elements ?? this.currentElements())
    },

    createGroup(group: HorizontalLayoutGroupConfig): HorizontalLayoutGroupConfig {
      this.replaceValidated([...this.groups, group])
      return this.groups[this.groups.length - 1]
    },

    updateGroup(
      id: string,
      patch: Partial<Omit<HorizontalLayoutGroupConfig, 'id' | 'members'>>,
    ): void {
      const index = this.groups.findIndex((group) => group.id === id)
      if (index < 0) throw new Error(`Layout group not found: ${id}`)
      const next = cloneGroups(this.groups)
      next[index] = { ...next[index], ...patch, id: next[index].id }
      this.replaceValidated(next)
    },

    updateMember(
      groupId: string,
      elementId: string,
      patch: Partial<Pick<HorizontalLayoutMemberConfig, 'gapBefore' | 'offsetY'>>,
    ): void {
      const groupIndex = this.groups.findIndex((group) => group.id === groupId)
      if (groupIndex < 0) throw new Error(`Layout group not found: ${groupId}`)
      const memberIndex = this.groups[groupIndex].members.findIndex((member) => member.elementId === elementId)
      if (memberIndex < 0) throw new Error(`Layout group member not found: ${elementId}`)
      const next = cloneGroups(this.groups)
      next[groupIndex].members[memberIndex] = {
        ...next[groupIndex].members[memberIndex],
        ...patch,
        elementId,
      }
      this.replaceValidated(next)
    },

    reorderMembers(groupId: string, elementIds: string[]): void {
      const groupIndex = this.groups.findIndex((group) => group.id === groupId)
      if (groupIndex < 0) throw new Error(`Layout group not found: ${groupId}`)
      const group = this.groups[groupIndex]
      if (
        elementIds.length !== group.members.length
        || new Set(elementIds).size !== group.members.length
        || elementIds.some((elementId) => !group.members.some((member) => member.elementId === elementId))
      ) {
        throw new Error(`Member order must contain every member of layout group "${groupId}" exactly once`)
      }
      const memberById = new Map(group.members.map((member) => [member.elementId, member]))
      const next = cloneGroups(this.groups)
      next[groupIndex].members = elementIds.map((elementId) => ({ ...memberById.get(elementId)! }))
      this.replaceValidated(next)
    },

    removeMember(groupId: string, elementId: string): RemoveLayoutMemberResult {
      const groupIndex = this.groups.findIndex((group) => group.id === groupId)
      if (groupIndex < 0) return { group: null, autoDissolved: false, remainingElementIds: [] }
      const current = this.groups[groupIndex]
      const remainingMembers = current.members.filter((member) => member.elementId !== elementId)
      if (remainingMembers.length === current.members.length) {
        return {
          group: { ...current, members: current.members.map((member) => ({ ...member })) },
          autoDissolved: false,
          remainingElementIds: current.members.map((member) => member.elementId),
        }
      }
      const removedGroup = { ...current, members: current.members.map((member) => ({ ...member })) }
      const next = cloneGroups(this.groups)
      if (remainingMembers.length < 2) {
        next.splice(groupIndex, 1)
        this.replaceValidated(next)
        return {
          group: removedGroup,
          autoDissolved: true,
          remainingElementIds: remainingMembers.map((member) => member.elementId),
        }
      }
      next[groupIndex].members = remainingMembers
      this.replaceValidated(next)
      return {
        group: removedGroup,
        autoDissolved: false,
        remainingElementIds: remainingMembers.map((member) => member.elementId),
      }
    },

    dissolveGroup(groupId: string): HorizontalLayoutGroupConfig | null {
      const groupIndex = this.groups.findIndex((group) => group.id === groupId)
      if (groupIndex < 0) return null
      const removed = cloneGroups([this.groups[groupIndex]])[0]
      const next = cloneGroups(this.groups)
      next.splice(groupIndex, 1)
      this.replaceValidated(next)
      return removed
    },

    findGroupByElementId(elementId: string): HorizontalLayoutGroupConfig | null {
      return this.groups.find((group) => group.members.some((member) => member.elementId === elementId)) ?? null
    },

    hydrate(input: unknown, elements?: readonly AnyElementConfig[]): void {
      this.replaceValidated(input ?? [], elements ?? this.currentElements())
    },

    snapshot(): HorizontalLayoutGroupConfig[] {
      return cloneGroups(this.groups)
    },

    clear(): void {
      this.groups = []
    },
  },
})
