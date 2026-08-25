import type { LayerElement } from '@/types/layer'
import { getDisplayState, type DisplayStateMode } from '@/utils/displayStates'
import { toCanvasLayerIds } from './layerPanelOrder'
import type { HorizontalLayoutGroupConfig } from '@/types/layoutGroup'

export type LayerPanelLayerItem = {
  kind: 'layer'
  id: string
  layer: LayerElement
}

export type LayerPanelGroupItem = {
  kind: 'group'
  source: 'layout' | 'inferred'
  layoutGroupId?: string
  id: string
  key: string
  label: string
  members: LayerElement[]
  isExpanded: boolean
}

export type LayerPanelItem = LayerPanelLayerItem | LayerPanelGroupItem

const readGroupKey = (value: unknown): string => (value == null ? '' : String(value).trim())

export const getLayerGroupKey = (layer: LayerElement | any): string => {
  const object = layer?.element ?? layer
  return readGroupKey(object?.groupId ?? object?.groupKey ?? object?.groupName ?? object?.parentId ?? object?.dataProperty ?? object?.goalProperty ?? '')
}

export const buildLayerPanelItems = (
  layers: LayerElement[],
  expanded = new Set<string>(),
  layoutGroups: readonly HorizontalLayoutGroupConfig[] = [],
): LayerPanelItem[] => {
  const layerById = new Map(layers.map((layer) => [String(layer.id), layer]))
  const layoutGroupByMemberId = new Map<string, HorizontalLayoutGroupConfig>()
  layoutGroups.forEach((group) => group.members.forEach((member) => {
    if (layerById.has(member.elementId)) layoutGroupByMemberId.set(member.elementId, group)
  }))
  const membersByKey = new Map<string, LayerElement[]>()
  layers.forEach((layer) => {
    if (layoutGroupByMemberId.has(String(layer.id))) return
    const key = getLayerGroupKey(layer)
    if (!key || layer.eleType === 'global' || layer.eleType === 'background') return
    membersByKey.set(key, [...(membersByKey.get(key) ?? []), layer])
  })

  const emitted = new Set<string>()
  const emittedLayoutGroups = new Set<string>()
  const items: LayerPanelItem[] = []
  layers.forEach((layer) => {
    const layoutGroup = layoutGroupByMemberId.get(String(layer.id))
    if (layoutGroup) {
      if (emittedLayoutGroups.has(layoutGroup.id)) return
      emittedLayoutGroups.add(layoutGroup.id)
      const key = `layout:${layoutGroup.id}`
      items.push({
        kind: 'group',
        source: 'layout',
        layoutGroupId: layoutGroup.id,
        id: `group:${key}`,
        key,
        label: layoutGroup.name,
        members: layoutGroup.members
          .map((member) => layerById.get(member.elementId))
          .filter((member): member is LayerElement => Boolean(member)),
        isExpanded: expanded.has(key),
      })
      return
    }
    const key = getLayerGroupKey(layer)
    const members = key ? (membersByKey.get(key) ?? []) : []
    if (members.length < 2) {
      items.push({ kind: 'layer', id: `layer:${layer.id}`, layer })
      return
    }
    if (emitted.has(key)) return
    emitted.add(key)
    items.push({
      kind: 'group',
      source: 'inferred',
      id: `group:${key}`,
      key,
      label: key,
      members,
      isExpanded: expanded.has(key)
    })
  })
  return items
}

export const expandPanelItemsToLayerIds = (items: LayerPanelItem[]): string[] => items.flatMap((item) => (item.kind === 'group' ? item.members.map((layer) => layer.id) : [item.layer.id]))

export const retainExistingExpandedGroups = (expanded: Set<string>, items: LayerPanelItem[]): Set<string> => {
  const existing = new Set(items.filter((item) => item.kind === 'group').map((item) => item.key))
  return new Set([...expanded].filter((key) => existing.has(key)))
}

export const findCollapsedGroupsForLayerIds = (items: LayerPanelItem[], ids: string[]): string[] => {
  if (ids.length !== 1) return []
  const selectedId = String(ids[0])
  return items
    .filter((item): item is LayerPanelGroupItem => item.kind === 'group')
    .filter((item) => !item.isExpanded && item.members.some((member) => String(member.id) === selectedId))
    .map((item) => item.key)
}

export const resolvePanelItemsToCanvasIds = (items: LayerPanelItem[]): string[] => toCanvasLayerIds(expandPanelItemsToLayerIds(items))

export const areAllGroupMembersVisible = (members: LayerElement[], mode: DisplayStateMode): boolean => {
  return members.length > 0 && members.every((member) => getDisplayState(member.displayStates, mode))
}

export const getGroupVisibilityTarget = (memberVisibility: boolean[]): boolean => {
  return !memberVisibility.every(Boolean)
}

export const getGroupLockTarget = (memberLocks: boolean[]): boolean => {
  return !memberLocks.every(Boolean)
}

export const getGroupDeletionIds = (members: LayerElement[]): string[] => {
  return members.map((member) => String(member.id))
}
