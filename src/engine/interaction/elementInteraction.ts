import mapping from '@/elements/complication/interaction-sources.json'
import type { ElementInteraction } from '@/types/interaction'
import type { PropertiesMap, DataOptionsMap } from '@/types/properties'

export const INTERACTION_DEFAULTS = {
  action: 'none', target: 'fixed', complicationType: 18, complicationProperty: '',
  touchMode: 'auto', touchShape: 'rectangle', touchPadding: 8,
  touchWidth: 96, touchHeight: 64, touchOffsetX: 0, touchOffsetY: 0,
} as const
export const INTERACTION_ELEMENT_TYPES = new Set([
  'text', 'time', 'date', 'data', 'icon', 'label', 'unit', 'image', 'dynamicImage',
  'goal', 'goalBar', 'goalArc', 'battery', 'rectangle', 'circle', 'line', 'polygon', 'triangle',
  'barChart', 'lineChart', 'zoneMetric', 'indicator', 'moveBar', 'scrollableText', 'radialText', 'angledText',
])
export function supportsElementInteraction(element: { eleType?: string } | null | undefined): boolean {
  return INTERACTION_ELEMENT_TYPES.has(element?.eleType ?? '')
}
const sourceForSymbol = (symbol: unknown): number | undefined => typeof symbol === 'string' ? (mapping as Record<string, number>)[symbol] : undefined

export function followElementSource(element: Record<string, any>, properties: PropertiesMap, dataOptions: DataOptionsMap = {}): { source?: number; error?: string; unsupported?: string[]; propertyTitle?: string } {
  if (element.eleType === 'battery') return { source: 1 }
  const key = element.dataProperty || element.goalProperty
  if (key) {
    const property = properties[key]
    if (!property || !['data', 'goal'].includes(property.type)) return { error: 'The element has a missing data or goal property.' }
    const candidates: Array<{ value: unknown; metricSymbol?: unknown }> = property.metricSymbols?.length
      ? property.metricSymbols.map(symbol => ({ value: symbol, metricSymbol: symbol }))
      : (property.options ?? []).map((option: any) => ({ ...option, metricSymbol: option.metricSymbol ?? dataOptions[String(option.value)]?.metricSymbol ?? (typeof option.value === 'string' && option.value.startsWith(':') ? option.value : undefined) }))
    if (!candidates.length) return { error: 'The source property has no allowed options.' }
    const unsupported = candidates.filter(option => !sourceForSymbol(option.metricSymbol)).map(option => String((option as any).label ?? option.metricSymbol ?? option.value))
    const selected = candidates.find(option => option.value === property.value || option.metricSymbol === property.value)
      ?? candidates.find(option => (dataOptions[String(option.metricSymbol)] as any)?.valueCode === property.value)
    const source = sourceForSymbol(selected?.metricSymbol)
    return { source, unsupported, propertyTitle: property.title }
  }
  const source = sourceForSymbol(element.metricSymbol)
  return source ? { source } : { error: 'This element has no matching data source. Choose a fixed source or a Complication property.' }
}

export function captureInteraction(element: any, interaction: ElementInteraction | null | undefined = element.interaction): ElementInteraction | undefined {
  if (interaction == null) return undefined
  if (interaction.action === 'none') return { action: 'none' }
  const result = { ...interaction }
  if (typeof element.getBoundingRect === 'function') {
    const rect = element.getBoundingRect()
    const anchor = element.getXY?.() ?? { x: element.left, y: element.top }
    result.bounds = {
      centerOffsetX: rect.left + rect.width / 2 - anchor.x,
      centerOffsetY: rect.top + rect.height / 2 - anchor.y,
      width: Math.max(1, rect.width), height: Math.max(1, rect.height),
    }
  }
  return result
}

export function interactionTouchBounds(element: any) {
  const interaction = captureInteraction(element)
  if (interaction?.action !== 'complication' || !interaction.bounds) return null
  const item = { ...INTERACTION_DEFAULTS, ...interaction }
  const size = interaction.bounds
  let width = item.touchMode === 'auto' ? size.width + item.touchPadding * 2 : item.touchWidth
  let height = item.touchMode === 'auto' ? size.height + item.touchPadding * 2 : item.touchHeight
  if (item.touchShape === 'circle') width = height = Math.min(width, height)
  const anchor = element.getXY?.() ?? { x: element.left, y: element.top }
  return { left: anchor.x + size.centerOffsetX + item.touchOffsetX - width / 2, top: anchor.y + size.centerOffsetY + item.touchOffsetY - height / 2, width, height, shape: item.touchShape }
}

export function validateElementInteractions(properties: PropertiesMap, elements: Array<Record<string, any>>, dataOptions: DataOptionsMap = {}): string[] {
  const errors: string[] = []
  for (const element of elements) {
    if (element.interaction == null) continue
    try {
      const raw = element.interaction
      if (!raw || typeof raw !== 'object' || !['none', 'complication'].includes(raw.action)) throw new Error('Invalid interaction action')
      if (raw.action === 'none') continue
      if (!supportsElementInteraction(element)) throw new Error('Interaction is not supported on this element')
      const item = { ...INTERACTION_DEFAULTS, ...captureInteraction(element) }
      if (!['element', 'fixed', 'property'].includes(item.target)) throw new Error('Invalid interaction target')
      if (item.target === 'element') {
        const result = followElementSource(element, properties, dataOptions)
        if (result.error) throw new Error(result.error)
      } else if (item.target === 'property') {
        const property = properties[item.complicationProperty]
        if (!property || property.type !== 'complication') throw new Error('Missing interaction Complication property')
      } else if (!Number.isInteger(item.complicationType) || item.complicationType < 1 || item.complicationType > 42) throw new Error('Invalid interaction Complication source')
      if (!['auto', 'custom'].includes(item.touchMode) || !['rectangle', 'circle'].includes(item.touchShape)) throw new Error('Invalid interaction touch area')
      for (const [field, min, max] of [['touchPadding', 0, 100], ['touchWidth', 30, 454], ['touchHeight', 30, 454], ['touchOffsetX', -454, 454], ['touchOffsetY', -454, 454]] as const) {
        if (typeof item[field] !== 'number' || !Number.isFinite(item[field]) || item[field] < min || item[field] > max) throw new Error(`Invalid interaction ${field}`)
      }
      const bounds = item.bounds
      if (!bounds || ![bounds.centerOffsetX, bounds.centerOffsetY, bounds.width, bounds.height].every(value => typeof value === 'number' && Number.isFinite(value)) || bounds.width <= 0 || bounds.height <= 0 || bounds.width > 10000 || bounds.height > 10000 || Math.abs(bounds.centerOffsetX) > 10000 || Math.abs(bounds.centerOffsetY) > 10000) throw new Error('Missing or invalid interaction bounds')
    } catch (error) { errors.push(`${element.id}: ${(error as Error).message}`) }
  }
  return errors
}
