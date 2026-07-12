import type { LayerElement } from '@/types/layer'

export type LayerPanelLayerItem = {
  kind: 'layer'
  id: string
  layer: LayerElement
}

export type LayerPanelGroupItem = {
  kind: 'group'
  id: string
  key: string
  label: string
  members: LayerElement[]
  isExpanded: boolean
}

export type LayerPanelItem = LayerPanelLayerItem | LayerPanelGroupItem

const readGroupKey = (value: unknown): string => value == null ? '' : String(value).trim()

export const getLayerGroupKey = (layer: LayerElement | any): string => {
  const object = layer?.element ?? layer
  return readGroupKey(
    object?.groupId ??
    object?.groupKey ??
    object?.groupName ??
    object?.parentId ??
    object?.dataProperty ??
    object?.goalProperty ??
    '',
  )
}

export const buildLayerPanelItems = (
  layers: LayerElement[],
  expanded = new Set<string>(),
): LayerPanelItem[] => {
  const membersByKey = new Map<string, LayerElement[]>()
  layers.forEach((layer) => {
    const key = getLayerGroupKey(layer)
    if (!key || layer.eleType === 'global' || layer.eleType === 'background') return
    membersByKey.set(key, [...(membersByKey.get(key) ?? []), layer])
  })

  const emitted = new Set<string>()
  const items: LayerPanelItem[] = []
  layers.forEach((layer) => {
    const key = getLayerGroupKey(layer)
    const members = key ? membersByKey.get(key) ?? [] : []
    if (members.length < 2) {
      items.push({ kind: 'layer', id: `layer:${layer.id}`, layer })
      return
    }
    if (emitted.has(key)) return
    emitted.add(key)
    items.push({
      kind: 'group',
      id: `group:${key}`,
      key,
      label: key,
      members,
      isExpanded: expanded.has(key),
    })
  })
  return items
}

export const expandPanelItemsToLayerIds = (items: LayerPanelItem[]): string[] =>
  items.flatMap((item) => item.kind === 'group' ? item.members.map((layer) => layer.id) : [item.layer.id])

export const retainExistingExpandedGroups = (
  expanded: Set<string>,
  items: LayerPanelItem[],
): Set<string> => {
  const existing = new Set(items.filter((item) => item.kind === 'group').map((item) => item.key))
  return new Set([...expanded].filter((key) => existing.has(key)))
}
