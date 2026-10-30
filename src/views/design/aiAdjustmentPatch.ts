import { existingWeather, isRecord, validateSceneOperations } from './aiAdjustmentOperations'
import type { AdjustmentAddition, AdjustmentWeather, AdjustmentElement, AdjustmentFields, AdjustmentResult } from '@/api/wristo/aiAdjustment'

const numbers = new Set(['x1', 'y1', 'x2', 'y2', 'left', 'top', 'fontSize', 'iconSize', 'width', 'height', 'radius', 'angle', 'strokeWidth', 'opacity', 'charSpacing', 'lineHeight', 'borderRadius', 'borderWidth', 'gap'])
const colors = new Set(['fill', 'color', 'stroke', 'backgroundColor', 'textColor', 'borderColor', 'activeColor', 'inactiveColor'])
const contextKeys = ['layerName', 'textTemplate', 'text', 'metricSymbol', 'dataProperty', 'fontFamily', 'fillProperty', 'colorProperty', 'textProperty', 'layoutGroupId']
export function validAdjustmentValue(key: string, value: unknown, size = 1024): value is string | number {
  if (numbers.has(key)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return false
    if (key === 'opacity') return value >= 0 && value <= 1
    if (key === 'angle') return value >= -360 && value <= 360
    if (key === 'charSpacing') return value >= -1000 && value <= 5000
    if (['left', 'top', 'x1', 'y1', 'x2', 'y2'].includes(key)) return Math.abs(value) <= size * 4
    return value >= (['fontSize', 'iconSize', 'width', 'height', 'lineHeight'].includes(key) ? Number.MIN_VALUE : 0) && value <= size * 4
  }
  if (colors.has(key)) return typeof value === 'string' && /^#[a-f\d]{6}$/i.test(value)
  return key === 'textTemplate' && typeof value === 'string' && value.length <= 500
}
export function adjustmentElements(configs: readonly Record<string, any>[], groupedIds: ReadonlySet<string> = new Set(), size = 1024): AdjustmentElement[] {
  return configs.filter(c => c.id && !['global', 'background'].includes(c.eleType)).map(c => {
    const fields: AdjustmentFields = {}
    const editable = c.eleType === 'triangle' ? { ...c, angle: c.rotation ?? 0 } : c
    for (const [key, value] of Object.entries(editable)) {
      if (c.eleType === 'line' && ['left', 'top', 'width', 'height', 'fill', 'angle'].includes(key)) continue
      if (['text', 'rectangle', 'circle'].includes(c.eleType) && key === 'angle') continue
      // Layout-owned geometry and bound colors stay under their existing controls.
      if (groupedIds.has(String(c.id)) && !colors.has(key)) continue
      if (c[`${key}Property`] || (key === 'textTemplate' && (c.textProperty || c.localizedText || c.localization))) continue
      if (key === 'textTemplate' && c.eleType !== 'text') continue
      if (validAdjustmentValue(key, value, size)) fields[key] = value
    }
    const context: AdjustmentElement['context'] = {}
    for (const key of contextKeys) {
      const value = c[key]
      if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) context[key] = typeof value === 'string' ? value.slice(0, 2000) : value
    }
    const weather = existingWeather(c.visibility)
    context.weather = weather ?? 'custom'
    return { id: String(c.id), eleType: c.eleType, fields, context }
  })
}
export function validateAdjustment(elements: AdjustmentElement[], selected: string[], result: AdjustmentResult, size = 1024) {
  if (!isRecord(result) || Object.keys(result).some(k => !['summary', 'changes', 'additions', 'removals', 'weatherRules', 'systemRules'].includes(k)) || typeof result.summary !== 'string' || !result.summary.trim() || result.summary.length > 1000 || !Array.isArray(result.changes) || result.changes.length > 200) throw Error('Invalid adjustment result.')
  if (result.systemRules !== undefined) {
    const rules = result.systemRules
    if (!isRecord(rules) || Object.keys(rules).some(k => !['id', 'version', 'sha256'].includes(k)) ||
      typeof rules.id !== 'string' || !rules.id || typeof rules.version !== 'string' || !rules.version ||
      typeof rules.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(rules.sha256)) throw Error('Invalid adjustment rule identity.')
  }
  const operationCount = validateSceneOperations(elements, selected, result, size, validAdjustmentValue)
  if (!result.changes.length && !operationCount) throw Error('No changes were returned.')
  const seen = new Set<string>()
  for (const change of result.changes) {
    if (!isRecord(change) || Object.keys(change).length !== 2) throw Error('Invalid adjustment change.')
    const element = elements.find(e => e.id === change.id)
    if (!element || seen.has(change.id) || (selected.length && !selected.includes(change.id)) || !isRecord(change.patch) || !Object.keys(change.patch).length) throw Error('The adjustment is outside the selected scope.')
    seen.add(change.id)
    let different = false
    for (const [key, value] of Object.entries(change.patch)) {
      if (!Object.prototype.hasOwnProperty.call(element.fields, key) || !validAdjustmentValue(key, value, size)) throw Error('The adjustment contains an unsupported property.')
      if (element.fields[key] !== value) different = true
    }
    if (!different) throw Error('No changes were returned.')
  }
}
export async function fingerprintDesign(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}
export async function applyAdjustment(fingerprint: string, elements: AdjustmentElement[], selected: string[], result: AdjustmentResult, deps: {
  currentFingerprint: () => Promise<string>; atomic: (task: () => Promise<void>) => Promise<unknown>
  update: (id: string, patch: AdjustmentFields) => Promise<void>; save: () => void
  add?: (addition: AdjustmentAddition) => Promise<void>; remove?: (id: string) => Promise<void>
  weather?: (id: string, weather: AdjustmentWeather) => Promise<void>
}) {
  validateAdjustment(elements, selected, result)
  if (await deps.currentFingerprint() !== fingerprint) throw Error('The design changed. Send a new request using the current design.')
  if ((result.additions?.length && !deps.add) || (result.removals?.length && !deps.remove) || (result.weatherRules?.length && !deps.weather)) throw Error('This editor does not support scene operations.')
  await deps.atomic(async () => {
    for (const id of result.removals ?? []) await deps.remove!(id)
    for (const change of result.changes) await deps.update(change.id, change.patch)
    for (const rule of result.weatherRules ?? []) await deps.weather!(rule.id, rule.weather)
    for (const addition of result.additions ?? []) await deps.add!(addition)
  })
  deps.save()
}
