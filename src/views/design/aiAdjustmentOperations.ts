import type { AdjustmentAddition, AdjustmentElement, AdjustmentResult, AdjustmentWeather } from '@/api/wristo/aiAdjustment'
import type { AnyElementConfig } from '@/types/elements'
import type { DynamicValue } from '@/engine/expression/types'
import { createVisibilityExpression } from '@/components/expression/visibilityExpressionModel'

export const weatherCodes: Record<Exclude<AdjustmentWeather, 'always'>, readonly number[]> = {
  clear: [0], cloudy: [1, 12, 13], rain: [2, 5, 7, 8, 9], snow: [10], storm: [6], fog: [11], night: [3, 4],
}
export const weatherLabels: Record<AdjustmentWeather, string> = {
  always: 'Always visible', clear: 'Clear', cloudy: 'Cloudy', rain: 'Rain', snow: 'Snow', storm: 'Thunderstorm', fog: 'Fog', night: 'Clear / cloudy night',
}
export function isWeather(value: unknown): value is AdjustmentWeather {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(weatherLabels, value)
}
export function weatherVisibility(weather: AdjustmentWeather): DynamicValue<boolean> {
  if (weather === 'always') return { mode: 'literal', value: true }
  // Explicit null guard: null must never compare equal to clear weather (zero).
  return createVisibilityExpression(`!isnull((w01)) && (${weatherCodes[weather].map(code => `(w01) == ${code}`).join(' || ')})`, false)
}
export function existingWeather(visibility: unknown): AdjustmentWeather | undefined {
  if (!visibility) return 'always'
  for (const weather of Object.keys(weatherLabels) as AdjustmentWeather[]) {
    if (JSON.stringify(visibility) === JSON.stringify(weatherVisibility(weather))) return weather
  }
  return undefined
}
const common = ['left', 'top', 'fill', 'stroke', 'strokeWidth', 'opacity']
const fieldsByType: Record<AdjustmentAddition['eleType'], string[]> = {
  circle: [...common, 'radius'], rectangle: [...common, 'width', 'height', 'borderRadius'],
  triangle: [...common, 'width', 'height', 'angle'], line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'strokeWidth', 'opacity'],
  text: ['left', 'top', 'fontSize', 'fill', 'textTemplate'],
}
const requiredByType: Record<AdjustmentAddition['eleType'], string[]> = {
  circle: ['left', 'top', 'radius', 'fill'], rectangle: ['left', 'top', 'width', 'height', 'fill'],
  triangle: ['left', 'top', 'width', 'height', 'fill'], line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'strokeWidth'],
  text: ['left', 'top', 'fontSize', 'fill', 'textTemplate'],
}
export const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
export function validateSceneOperations(elements: AdjustmentElement[], selected: string[], result: AdjustmentResult, size: number, validValue: (key: string, value: unknown, size: number) => boolean) {
  const additions = result.additions ?? [], removals = result.removals ?? [], rules = result.weatherRules ?? []
  if (![additions, removals, rules].every(Array.isArray) || additions.length > 80 || removals.length > 200 || rules.length > 200 || (selected.length && additions.length)) throw Error('Invalid scene operations or selection scope.')
  const existing = new Set(elements.map(e => e.id)), ids = new Set(existing), removed = new Set<string>(), weatherIds = new Set<string>()
  const inScope = (id: unknown): id is string => typeof id === 'string' && existing.has(id) && (!selected.length || selected.includes(id))
  for (const id of removals) {
    if (!inScope(id) || removed.has(id) || result.changes.some(c => c.id === id)) throw Error('Invalid removal scope.')
    removed.add(id)
  }
  for (const rule of rules) {
    if (elements.find(e => e.id === rule?.id)?.context.weather === 'custom') throw Error('Custom visibility rules must be edited in Properties.')
    if (!isRecord(rule) || Object.keys(rule).length !== 2 || !inScope(rule.id) || removed.has(rule.id) || weatherIds.has(rule.id) || !isWeather(rule.weather)) throw Error('Invalid weather rule.')
    weatherIds.add(rule.id)
  }
  for (const addition of additions) {
    if (!isRecord(addition) || Object.keys(addition).some(k => !['id', 'eleType', 'fields', 'weather', 'layerName'].includes(k)) || typeof addition.id !== 'string' || !addition.id.trim() || addition.id.length > 100 || ids.has(addition.id)
      || !Object.prototype.hasOwnProperty.call(fieldsByType, addition.eleType) || !isRecord(addition.fields)) throw Error('Invalid new element.')
    ids.add(addition.id)
    if (addition.weather !== undefined && !isWeather(addition.weather)) throw Error('Invalid weather condition.')
    if (addition.layerName !== undefined && (typeof addition.layerName !== 'string' || addition.layerName.length > 100)) throw Error('Invalid layer name.')
    if (requiredByType[addition.eleType].some(k => !Object.prototype.hasOwnProperty.call(addition.fields, k))) throw Error('Missing new element geometry.')
    for (const [key, value] of Object.entries(addition.fields)) {
      const endpoint = ['x1', 'y1', 'x2', 'y2'].includes(key)
      if (!fieldsByType[addition.eleType].includes(key) || !(endpoint ? typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= size * 4 : validValue(key, value, size))) throw Error('Invalid new element property.')
    }
    if (addition.eleType === 'text' && !/^[\x20-\x7E]{0,500}$/.test(String(addition.fields.textTemplate))) throw Error('New text must use supported font characters.')
  }
  if (elements.length - removals.length + additions.length > 200) throw Error('AI adjustments support up to 200 design elements.')
  return additions.length + removals.length + rules.length
}
export function additionConfig(addition: AdjustmentAddition, fontFamily = 'roboto-condensed-regular'): AnyElementConfig {
  const { angle, ...fields } = addition.fields
  const geometry = addition.eleType === 'line' ? { left: (Number(fields.x1) + Number(fields.x2)) / 2, top: (Number(fields.y1) + Number(fields.y2)) / 2 } : {}
  return {
    originX: 'center', originY: 'center', stroke: '#FFFFFF', strokeWidth: 0, opacity: 1,
    borderRadius: 0, ...geometry, ...fields,
    ...(addition.eleType === 'text' ? { fontFamily } : {}),
    ...(addition.eleType === 'triangle' ? { rotation: angle ?? 0 } : {}),
    id: addition.id, eleType: addition.eleType, layerName: addition.layerName || addition.eleType,
    displayStates: { active: true, ambient: false }, visibility: weatherVisibility(addition.weather ?? 'always'),
  } as unknown as AnyElementConfig
}
