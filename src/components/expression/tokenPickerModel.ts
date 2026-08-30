import { pinyin } from 'pinyin-pro'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import type { ExpressionTokenDefinition } from '@/engine/expression/types'

const searchableValues = (definition: ExpressionTokenDefinition) => [
  definition.code,
  definition.label,
  definition.labelCn,
  definition.description,
  definition.descriptionCn,
  definition.unit || '',
]

const normalizePinyin = (value: string) => value.toLocaleLowerCase().replace(/[\s:_-]+/g, '')

const matchesSearch = (definition: ExpressionTokenDefinition, query: string) => {
  const normalizedQuery = query.toLocaleLowerCase()
  const normalizedPinyinQuery = normalizePinyin(query)

  return searchableValues(definition).some((value) => {
    if (value.toLocaleLowerCase().includes(normalizedQuery)) return true

    const fullPinyin = normalizePinyin(pinyin(value, { toneType: 'none', type: 'array', v: true }).join(''))
    const initials = normalizePinyin(pinyin(value, { pattern: 'first', toneType: 'none', type: 'array', v: true }).join(''))
    return Boolean(normalizedPinyinQuery)
      && (fullPinyin.includes(normalizedPinyinQuery) || initials.includes(normalizedPinyinQuery))
  })
}

export const filterExpressionTokens = (query: string, appLanguage?: import('@/types/localization').AppLanguage): readonly ExpressionTokenDefinition[] => {
  const normalized = query.trim()
  return DEFAULT_EXPRESSION_TOKEN_CATALOG.definitions.filter((definition) => {
    if (appLanguage && definition.appLanguages && !definition.appLanguages.includes(appLanguage)) return false
    return !normalized || matchesSearch(definition, normalized)
  })
}

export const getReferencedTokenDefinitions = (source: string): ExpressionTokenDefinition[] => {
  const seen = new Set<string>()
  return [...source.matchAll(/\(([a-zA-Z][a-zA-Z0-9_.]*)\)/g)]
    .map((match) => DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode(match[1]))
    .filter((definition): definition is ExpressionTokenDefinition => Boolean(definition))
    .filter((definition) => !seen.has(definition.id) && Boolean(seen.add(definition.id)))
}
