import type { ExpressionTokenDefinition } from './types'
import { PRACTICAL_EXPRESSION_TOKEN_DEFINITIONS } from './practicalTokenDefinitions'

export interface ExpressionTokenCatalog {
  readonly definitions: readonly ExpressionTokenDefinition[]
  getByCode(code: string): ExpressionTokenDefinition | undefined
  getById(id: string): ExpressionTokenDefinition | undefined
}

export function createExpressionTokenCatalog(
  definitions: readonly ExpressionTokenDefinition[],
): ExpressionTokenCatalog {
  const byCode = new Map(definitions.map((definition) => [definition.code, definition]))
  const byId = new Map(definitions.map((definition) => [definition.id, definition]))
  return {
    definitions: Object.freeze([...definitions]),
    getByCode: (code) => byCode.get(code),
    getById: (id) => byId.get(id),
  }
}

export const DEFAULT_EXPRESSION_TOKEN_CATALOG = createExpressionTokenCatalog(
  PRACTICAL_EXPRESSION_TOKEN_DEFINITIONS,
)
