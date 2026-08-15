import { parseExpression } from './parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from './tokenCatalog'
import { inferExpressionType } from './typeChecker'

export function validateVisibilityExpression(value: unknown): string[] {
  if (value === undefined) return []
  if (!value || typeof value !== 'object') return ['Visibility must be an object']
  const visibility = value as Record<string, any>
  if (visibility.mode === 'literal') {
    return typeof visibility.value === 'boolean' ? [] : ['Literal visibility must be boolean']
  }
  if (visibility.mode !== 'expression') return ['Visibility mode must be literal or expression']

  const errors: string[] = []
  if (typeof visibility.fallback !== 'boolean') errors.push('Visibility fallback must be boolean')
  const expression = visibility.expression
  if (!expression || typeof expression !== 'object') return [...errors, 'Visibility expression is required']
  if (expression.version !== 1) errors.push('Unsupported visibility expression version')
  if (typeof expression.source !== 'string' || !expression.source.trim()) {
    return [...errors, 'Visibility expression source is required']
  }
  try {
    const canonical = parseExpression(expression.source, DEFAULT_EXPRESSION_TOKEN_CATALOG)
    inferExpressionType(canonical.ast, DEFAULT_EXPRESSION_TOKEN_CATALOG, 'boolean')
    if (JSON.stringify(canonical.ast) !== JSON.stringify(expression.ast)) {
      errors.push('Visibility source and AST do not match')
    }
    if (expression.resultType !== 'boolean') errors.push('Visibility result type must be boolean')
  } catch (cause) {
    errors.push(cause instanceof Error ? cause.message : String(cause))
  }
  return [...new Set(errors)]
}
