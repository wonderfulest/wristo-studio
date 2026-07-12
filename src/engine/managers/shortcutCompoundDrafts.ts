import type { ShortcutDraft } from './shortcutPlacementManager'

export type ShortcutDraftFactory = (
  category: string, elementType: string, overrides: Record<string, any>, key: string,
) => ShortcutDraft

export function buildGoalBarDrafts(factory: ShortcutDraftFactory, input: {
  propertyKey: string; left: number; top: number; width: number
}): ShortcutDraft[] {
  const shared = { goalProperty: input.propertyKey, dataProperty: null }
  const half = input.width / 2
  return [
    factory('goal', 'goalBar', { ...shared, left: input.left, top: input.top }, 'goal-bar'),
    factory('metric', 'icon', { ...shared, left: input.left - half, top: input.top, originX: 'center', fontSize: 24, iconSize: 24 }, 'goal-bar-icon'),
    factory('metric', 'data', { ...shared, left: input.left + half, top: input.top, originX: 'left', fontSize: 24 }, 'goal-bar-value'),
  ]
}

export function buildGoalArcDrafts(factory: ShortcutDraftFactory, input: {
  propertyKey: string; left: number; top: number
}): ShortcutDraft[] {
  const shared = { goalProperty: input.propertyKey, dataProperty: null }
  return [
    factory('goal', 'goalArc', { ...shared, left: input.left, top: input.top, strokeWidth: 4, bgStrokeWidth: 4, progress: 0.45 }, 'goal-arc'),
    factory('metric', 'icon', { ...shared, left: input.left, top: input.top - 16, originX: 'center', fontSize: 24, iconSize: 24 }, 'goal-arc-icon'),
    factory('metric', 'data', { ...shared, left: input.left, top: input.top + 16, originX: 'center', fontSize: 24 }, 'goal-arc-value'),
  ]
}

export function buildDataFieldDrafts(factory: ShortcutDraftFactory, input: {
  propertyKey: string; metricSymbol: string; unit: string; left: number; top: number; fontSize: number
}): ShortcutDraft[] {
  const shared = { dataProperty: input.propertyKey, goalProperty: null, metricSymbol: input.metricSymbol, left: input.left, originX: 'center' }
  const drafts = [
    factory('metric', 'icon', { ...shared, top: input.top - input.fontSize }, 'data-icon'),
    factory('metric', 'data', { ...shared, top: input.top }, 'data-value'),
  ]
  if (input.unit) drafts.push(factory('metric', 'unit', { ...shared, top: input.top + input.fontSize * 0.8 }, 'data-unit'))
  return drafts
}
