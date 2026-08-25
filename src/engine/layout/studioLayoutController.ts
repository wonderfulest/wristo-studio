import { nanoid } from 'nanoid'
import type { FabricElement } from '@/types/element'
import type { HorizontalLayoutGroupConfig } from '@/types/layoutGroup'
import { isHorizontalLayoutElementType } from '@/types/layoutGroup'
import { layoutHorizontalGroup, type HorizontalLayoutResult } from './horizontalLayout'
import { measureStudioLayoutMember } from './studioLayoutMeasurement'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useLayoutGroupStore } from '@/stores/layoutGroupStore'
import { useLayerStore } from '@/stores/layerStore'

const projections = new Map<string, HorizontalLayoutResult>()
const pendingGroups = new Set<string>()
let reflowScheduled = false
let applyingProjection = false

const getCanvasElements = (): FabricElement[] => (
  (useCanvasStore().canvas?.getObjects?.() ?? []) as FabricElement[]
)

const getCanvasElementById = (id: string): FabricElement | null => (
  getCanvasElements().find((element: any) => String(element?.id ?? '') === id) ?? null
)

const persistElementPosition = (element: FabricElement): void => {
  const anyElement = element as any
  const id = String(anyElement?.id ?? '')
  if (!id) return
  const patch: Record<string, number> = {
    left: Number(anyElement.left ?? 0),
    top: Number(anyElement.top ?? 0),
  }
  if (Number.isFinite(Number(anyElement.topBase))) patch.topBase = Number(anyElement.topBase)
  useElementDataStore().patchElement(id, patch as any)
}

export function getLayoutGroupProjection(groupId: string): HorizontalLayoutResult | null {
  return projections.get(groupId) ?? null
}

export function reflowLayoutGroup(groupId: string): HorizontalLayoutResult | null {
  if (applyingProjection) return projections.get(groupId) ?? null
  const group = useLayoutGroupStore().groups.find((candidate) => candidate.id === groupId)
  if (!group) {
    projections.delete(groupId)
    return null
  }
  const mode = useLayerStore().previewMode
  const measured = group.members.map((member) => {
    const element = getCanvasElementById(member.elementId)
    const measurement = element
      ? measureStudioLayoutMember(element, mode)
      : { width: 0, height: 0, participates: false, placeAtVisualCenter: () => undefined }
    return { member, element, measurement }
  })
  const result = layoutHorizontalGroup({
    left: group.left,
    top: group.top,
    originX: group.originX,
    members: measured.map(({ member, measurement }) => ({
      elementId: member.elementId,
      width: measurement.width,
      height: measurement.height,
      participates: measurement.participates,
      gapBefore: member.gapBefore,
      offsetY: member.offsetY,
    })),
  })

  applyingProjection = true
  try {
    const positionedById = new Map(result.members.map((member) => [member.elementId, member]))
    measured.forEach(({ member, element, measurement }) => {
      if (!element) return
      ;(element as any).lockMovementX = true
      const positioned = positionedById.get(member.elementId)
      if (!positioned) return
      measurement.placeAtVisualCenter(positioned.centerX, positioned.centerY)
      persistElementPosition(element)
    })
  } finally {
    applyingProjection = false
  }
  projections.set(groupId, result)
  useCanvasStore().canvas?.requestRenderAll?.()
  return result
}

export function reflowAllLayoutGroups(): void {
  useLayoutGroupStore().groups.forEach((group) => reflowLayoutGroup(group.id))
}

export function scheduleReflowForElement(elementId: string): void {
  const group = useLayoutGroupStore().findGroupByElementId(String(elementId))
  if (!group) return
  pendingGroups.add(group.id)
  if (reflowScheduled) return
  reflowScheduled = true
  queueMicrotask(() => {
    reflowScheduled = false
    const groupIds = [...pendingGroups]
    pendingGroups.clear()
    groupIds.forEach(reflowLayoutGroup)
  })
}

export function createLayoutGroupFromSelection(
  elementIds: string[],
  options: { id?: string; name?: string } = {},
): string {
  const uniqueIds = [...new Set(elementIds.map(String))]
  if (uniqueIds.length < 2) throw new Error('A horizontal layout group requires at least two elements')
  const layoutStore = useLayoutGroupStore()
  const items = uniqueIds.map((elementId) => {
    if (layoutStore.findGroupByElementId(elementId)) {
      throw new Error(`Element already belongs to a layout group: ${elementId}`)
    }
    const element = getCanvasElementById(elementId)
    if (!element) throw new Error(`Canvas element not found: ${elementId}`)
    const eleType = String((element as any).eleType ?? '')
    if (!isHorizontalLayoutElementType(eleType)) {
      throw new Error(`Unsupported horizontal layout element type: ${eleType}`)
    }
    const bounds = (element as any).getBoundingRect()
    return { elementId, element, bounds }
  }).sort((left, right) => Number(left.bounds.left) - Number(right.bounds.left))
  const minLeft = Math.min(...items.map((item) => Number(item.bounds.left)))
  const maxRight = Math.max(...items.map((item) => Number(item.bounds.left) + Number(item.bounds.width)))
  const minTop = Math.min(...items.map((item) => Number(item.bounds.top)))
  const maxBottom = Math.max(...items.map((item) => Number(item.bounds.top) + Number(item.bounds.height)))
  const id = options.id || nanoid()
  const group: HorizontalLayoutGroupConfig = {
    id,
    name: options.name?.trim() || `Layout Group ${layoutStore.groups.length + 1}`,
    direction: 'horizontal',
    left: (minLeft + maxRight) / 2,
    top: (minTop + maxBottom) / 2,
    originX: 'center',
    members: items.map((item) => ({ elementId: item.elementId, gapBefore: 0, offsetY: 0 })),
  }
  layoutStore.createGroup(group)
  reflowLayoutGroup(id)
  return id
}

export function moveLayoutGroup(groupId: string, left: number, top: number): void {
  useLayoutGroupStore().updateGroup(groupId, { left, top })
  reflowLayoutGroup(groupId)
}

export function moveLayoutGroupByProxyCenter(
  groupId: string,
  centerX: number,
  centerY: number,
): HorizontalLayoutResult | null {
  const layoutStore = useLayoutGroupStore()
  const group = layoutStore.groups.find((candidate) => candidate.id === groupId)
  if (!group) return null
  const projection = getLayoutGroupProjection(groupId) ?? reflowLayoutGroup(groupId)
  if (!projection) return null
  const currentCenterX = projection.left + projection.width / 2
  const currentCenterY = projection.top + projection.height / 2
  layoutStore.updateGroup(groupId, {
    left: group.left + centerX - currentCenterX,
    top: group.top + centerY - currentCenterY,
  })
  return reflowLayoutGroup(groupId)
}

export function dissolveLayoutGroup(groupId: string): HorizontalLayoutGroupConfig | null {
  reflowLayoutGroup(groupId)
  const removed = useLayoutGroupStore().dissolveGroup(groupId)
  removed?.members.forEach((member) => {
    const element = getCanvasElementById(member.elementId)
    if (!element) return
    ;(element as any).lockMovementX = false
    persistElementPosition(element)
  })
  projections.delete(groupId)
  useCanvasStore().canvas?.requestRenderAll?.()
  return removed
}

export function removeElementFromLayoutGroups(elementId: string): void {
  const layoutStore = useLayoutGroupStore()
  const group = layoutStore.findGroupByElementId(elementId)
  if (!group) return
  reflowLayoutGroup(group.id)
  const result = layoutStore.removeMember(group.id, elementId)
  if (result.autoDissolved) {
    result.remainingElementIds.forEach((remainingId) => {
      const element = getCanvasElementById(remainingId)
      if (!element) return
      ;(element as any).lockMovementX = false
      persistElementPosition(element)
    })
    projections.delete(group.id)
  } else {
    reflowLayoutGroup(group.id)
  }
}

export function clearLayoutGroupProjections(): void {
  projections.clear()
  pendingGroups.clear()
}
