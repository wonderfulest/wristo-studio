import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import type { ExpressionTokenDefinition } from '@/engine/expression/types'

const searchableText = (definition: ExpressionTokenDefinition) => [
  definition.code,
  definition.label,
  definition.labelCn,
  definition.description,
  definition.descriptionCn,
  definition.unit || '',
].join(' ').toLocaleLowerCase()

export const filterExpressionTokens = (query: string, appLanguage?: import('@/types/localization').AppLanguage): readonly ExpressionTokenDefinition[] => {
  const normalized = query.trim().toLocaleLowerCase()
  return DEFAULT_EXPRESSION_TOKEN_CATALOG.definitions.filter((definition) => {
    if (appLanguage && definition.appLanguages && !definition.appLanguages.includes(appLanguage)) return false
    return !normalized || searchableText(definition).includes(normalized)
  })
}

export const getReferencedTokenDefinitions = (source: string): ExpressionTokenDefinition[] => {
  const seen = new Set<string>()
  return [...source.matchAll(/\(([a-zA-Z][a-zA-Z0-9_.]*)\)/g)]
    .map((match) => DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode(match[1]))
    .filter((definition): definition is ExpressionTokenDefinition => Boolean(definition))
    .filter((definition) => !seen.has(definition.id) && Boolean(seen.add(definition.id)))
}
