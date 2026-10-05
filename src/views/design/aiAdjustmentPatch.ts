import type { AdjustmentElement, AdjustmentFields, AdjustmentResult } from '@/api/wristo/aiAdjustment'

const numbers = new Set(['left', 'top', 'fontSize', 'iconSize', 'width', 'height', 'radius', 'angle', 'strokeWidth', 'opacity', 'charSpacing', 'lineHeight', 'borderRadius', 'borderWidth', 'gap'])
const colors = new Set(['fill', 'color', 'stroke', 'backgroundColor', 'textColor', 'borderColor', 'activeColor', 'inactiveColor'])
const contextKeys = ['layerName', 'textTemplate', 'text', 'metricSymbol', 'dataProperty', 'fontFamily', 'fillProperty', 'colorProperty', 'textProperty', 'layoutGroupId']
export function validAdjustmentValue(key: string, value: unknown, size = 1024): value is string | number {
  if (numbers.has(key)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return false
    if (key === 'opacity') return value >= 0 && value <= 1
    if (key === 'angle') return value >= -360 && value <= 360
    if (key === 'charSpacing') return value >= -1000 && value <= 5000
    if (key === 'left' || key === 'top') return Math.abs(value) <= size * 4
    return value >= (['fontSize', 'iconSize', 'width', 'height', 'lineHeight'].includes(key) ? Number.MIN_VALUE : 0) && value <= size * 4
  }
  if (colors.has(key)) return typeof value === 'string' && /^#[a-f\d]{6}$/i.test(value)
  return key === 'textTemplate' && typeof value === 'string' && value.length <= 500
}
export function adjustmentElements(configs: readonly Record<string, any>[], groupedIds: ReadonlySet<string> = new Set(), size = 1024): AdjustmentElement[] {
  return configs.filter(c => c.id && !['global', 'background'].includes(c.eleType)).map(c => {
    const fields: AdjustmentFields = {}
    for (const [key, value] of Object.entries(c)) {
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
    return { id: String(c.id), eleType: c.eleType, fields, context }
  })
}
export function validateAdjustment(elements: AdjustmentElement[], selected: string[], result: AdjustmentResult, size = 1024) {
  if (!result || typeof result.summary !== 'string' || result.summary.length > 1000 || !Array.isArray(result.changes) || !result.changes.length || result.changes.length > 200) throw Error('Invalid adjustment result.')
  const seen = new Set<string>()
  for (const change of result.changes) {
    const element = elements.find(e => e.id === change.id)
    if (!element || seen.has(change.id) || (selected.length && !selected.includes(change.id)) || !change.patch || typeof change.patch !== 'object' || !Object.keys(change.patch).length) throw Error('The adjustment is outside the selected scope.')
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
}) {
  validateAdjustment(elements, selected, result)
  if (await deps.currentFingerprint() !== fingerprint) throw Error('The design changed. Send a new request using the current design.')
  await deps.atomic(async () => {
    for (const change of result.changes) await deps.update(change.id, change.patch)
  })
  deps.save()
}
