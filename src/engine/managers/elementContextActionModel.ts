export type ContextElement = {
  id?: unknown
  eleType?: unknown
  locked?: boolean
  left?: number
  top?: number
  topBase?: number
  flipX?: boolean
  flipY?: boolean
  set?: (patch: Record<string, unknown>) => unknown
  setCoords?: () => void
}

export type ElementActionAvailability = {
  canCopy: boolean
  canPaste: boolean
  canDelete: boolean
  canBringForward: boolean
  canSendBackward: boolean
  canBringToFront: boolean
  canSendToBack: boolean
  canFlip: boolean
  canRound: boolean
}

export function isFixedContextElement(element: ContextElement): boolean {
  return element.eleType === 'global' || element.eleType === 'background'
}

export function isMutableContextElement(element: ContextElement): boolean {
  return element.id != null && !element.locked && !isFixedContextElement(element)
}

export function getElementActionAvailability(selected: ContextElement[], objects: ContextElement[], canPaste: boolean): ElementActionAvailability {
  const hasSelection = selected.length > 0
  const canMutate = hasSelection && selected.every(isMutableContextElement)
  const movable = objects.filter((element) => element.id != null && !isFixedContextElement(element))
  const indices = selected.map((element) => movable.indexOf(element)).filter((index) => index >= 0)
  const hasLayerSelection = canMutate && indices.length === selected.length
  const canMoveUp = hasLayerSelection && indices.some((index) => index < movable.length - 1)
  const canMoveDown = hasLayerSelection && indices.some((index) => index > 0)
  return { canCopy: hasSelection, canPaste, canDelete: canMutate, canBringForward: canMoveUp, canSendBackward: canMoveDown, canBringToFront: canMoveUp, canSendToBack: canMoveDown, canFlip: canMutate, canRound: canMutate }
}

export function toggleElementFlip(element: ContextElement, axis: 'horizontal' | 'vertical'): Record<string, boolean> {
  const patch: Record<string, boolean> = axis === 'horizontal'
    ? { flipX: !Boolean(element.flipX) }
    : { flipY: !Boolean(element.flipY) }
  element.set?.(patch)
  element.setCoords?.()
  return patch
}

export function roundElementPosition(element: ContextElement): Record<string, number> {
  const left = Number(element.left ?? 0)
  const top = Number(element.top ?? 0)
  const roundedTop = Math.round(top)
  const patch: Record<string, number> = { left: Math.round(left), top: roundedTop }
  const topBase = Number(element.topBase)
  if (Number.isFinite(topBase)) patch.topBase = topBase + (roundedTop - top)
  element.set?.(patch)
  element.setCoords?.()
  return patch
}
