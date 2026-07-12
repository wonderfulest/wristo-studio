export type LayerOrderTarget = {
  id?: unknown
  eleType?: unknown
  locked?: boolean
  selectable?: boolean
  evented?: boolean
  hasControls?: boolean
}

export type LayerOrderAvailability = {
  canMoveUp: boolean
  canMoveDown: boolean
}

let expandedTargetId: string | null = null

const LAYER_ORDER_CONTROL_TITLES: Record<string, string> = {
  layerOrderControl: 'Object Actions',
  cloneActionControl: 'Clone',
  deleteActionControl: 'Delete',
  bringToFrontControl: 'Bring to Front',
  bringForwardControl: 'Bring Forward',
  sendBackwardControl: 'Send Backward',
  sendToBackControl: 'Send to Back',
}

function isFixedLayer(target: LayerOrderTarget): boolean {
  const type = String(target.eleType ?? '')
  return type === 'global' || type === 'background'
}

export function isLayerOrderControlTarget(target: LayerOrderTarget | null | undefined): boolean {
  return Boolean(
    target?.id != null &&
      target.eleType &&
      !isFixedLayer(target) &&
      !target.locked &&
      target.selectable !== false &&
      target.evented !== false &&
      target.hasControls !== false,
  )
}

export function getLayerOrderAvailability(
  objects: LayerOrderTarget[],
  target: LayerOrderTarget,
): LayerOrderAvailability {
  const movable = objects.filter((item) => item.id != null && item.eleType && !isFixedLayer(item))
  const index = movable.indexOf(target)
  return {
    canMoveUp: index >= 0 && index < movable.length - 1,
    canMoveDown: index > 0,
  }
}

export function toggleExpandedLayerOrderControl(id: string): boolean {
  expandedTargetId = expandedTargetId === id ? null : id
  return expandedTargetId === id
}

export function isLayerOrderControlExpanded(id: string): boolean {
  return expandedTargetId === id
}

export function getExpandedLayerOrderControlId(): string | null {
  return expandedTargetId
}

export function clearExpandedLayerOrderControl(): void {
  expandedTargetId = null
}

export function getLayerOrderControlTitle(controlKey: unknown): string {
  return typeof controlKey === 'string' ? (LAYER_ORDER_CONTROL_TITLES[controlKey] ?? '') : ''
}
