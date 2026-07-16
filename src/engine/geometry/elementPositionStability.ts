import type { FabricElement } from '@/types/element'

export type ElementPositionSnapshot = {
  left?: number
  top?: number
}

const POSITION_AXES = ['left', 'top'] as const
type PositionAxis = (typeof POSITION_AXES)[number]

function hasOwn(target: unknown, key: PropertyKey): boolean {
  return Boolean(target) && Object.prototype.hasOwnProperty.call(target, key)
}

function finiteNumber(value: unknown): number | undefined {
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function hasExplicitPosition(patch: Record<string, unknown>, axis: PositionAxis): boolean {
  return hasOwn(patch, axis) && finiteNumber(patch[axis]) !== undefined
}

export function captureRuntimePosition(element: Partial<FabricElement>): ElementPositionSnapshot {
  return {
    left: finiteNumber(element.left),
    top: finiteNumber(element.top)
  }
}

export function captureBusinessPosition(
  element: Partial<FabricElement>,
  persistedConfig?: Record<string, unknown> | null,
): ElementPositionSnapshot {
  const widgetConfig = (element as any)?.__element?.config as Record<string, unknown> | undefined
  const runtime = captureRuntimePosition(element)
  return {
    left: finiteNumber(persistedConfig?.left) ?? finiteNumber(widgetConfig?.left) ?? runtime.left,
    top: finiteNumber(persistedConfig?.top) ?? finiteNumber(widgetConfig?.top) ?? runtime.top
  }
}

export function restoreUnpatchedRuntimePosition(
  element: Partial<FabricElement>,
  snapshot: ElementPositionSnapshot,
  patch: Record<string, unknown>,
): boolean {
  const restoration: ElementPositionSnapshot = {}

  POSITION_AXES.forEach((axis) => {
    if (
      !hasExplicitPosition(patch, axis)
      && snapshot[axis] !== undefined
      && finiteNumber((element as any)[axis]) !== snapshot[axis]
    ) {
      restoration[axis] = snapshot[axis]
    }
  })

  if (Object.keys(restoration).length === 0) return false
  if (typeof (element as any).set === 'function') (element as any).set(restoration)
  else Object.assign(element, restoration)
  ;(element as any).setCoords?.()
  return true
}

export function applyStableBusinessPosition<T extends Record<string, any>>(
  config: T,
  snapshot: ElementPositionSnapshot,
  patch: Record<string, unknown>,
): T {
  const next: Record<string, any> = { ...config }

  POSITION_AXES.forEach((axis) => {
    if (hasExplicitPosition(patch, axis)) {
      const normalized = finiteNumber(next[axis]) ?? finiteNumber(patch[axis])
      if (normalized !== undefined) next[axis] = normalized
      return
    }
    if (snapshot[axis] !== undefined) next[axis] = snapshot[axis]
  })

  return next as T
}

export function syncWidgetBusinessPosition(
  element: Partial<FabricElement>,
  config: ElementPositionSnapshot,
): void {
  const widgetConfig = (element as any)?.__element?.config as Record<string, unknown> | undefined
  if (!widgetConfig) return
  POSITION_AXES.forEach((axis: PositionAxis) => {
    if (config[axis] !== undefined) widgetConfig[axis] = config[axis]
  })
}
