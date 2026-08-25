import { pinyin } from 'pinyin-pro'

type SearchableDataOption = {
  metricSymbol?: unknown
  name?: unknown
  label?: unknown
  settingsLabel?: { eng?: unknown; zhs?: unknown }
  dataLabel?: { eng?: unknown; zhs?: unknown }
}

const normalize = (value: unknown): string => String(value ?? '')
  .toLocaleLowerCase()
  .replace(/[\s:_-]+/g, '')

const localizedStrings = (value: unknown): string[] => {
  if (typeof value === 'string') return [value]
  if (!value || typeof value !== 'object') return []
  return Object.values(value).flatMap(localizedStrings)
}

export function matchesDataOptionSearch(option: SearchableDataOption, query: string): boolean {
  const needle = normalize(query)
  if (!needle) return true

  const sourceValues = [
    option.metricSymbol,
    option.name,
    option.label,
    ...localizedStrings(option.settingsLabel),
    ...localizedStrings(option.dataLabel),
  ].filter((value): value is string => typeof value === 'string' && value.length > 0)

  return sourceValues.some((value) => {
    const normalizedValue = normalize(value)
    if (normalizedValue.includes(needle)) return true

    const fullPinyin = normalize(pinyin(value, { toneType: 'none', type: 'array' }).join(''))
    const initials = normalize(pinyin(value, { pattern: 'first', toneType: 'none', type: 'array' }).join(''))
    return fullPinyin.includes(needle) || initials.includes(needle)
  })
}
