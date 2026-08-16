import { parseExpression } from './parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from './tokenCatalog'
import { inferExpressionType } from './typeChecker'

function structurallyEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => structurallyEqual(value, right[index]))
  }
  const leftRecord = left as Record<string, unknown>
  const rightRecord = right as Record<string, unknown>
  const leftKeys = Object.keys(leftRecord)
  const rightKeys = Object.keys(rightRecord)
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => Object.prototype.hasOwnProperty.call(rightRecord, key)
      && structurallyEqual(leftRecord[key], rightRecord[key]))
}

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
    if (!structurallyEqual(canonical.ast, expression.ast)) {
      errors.push('Visibility source and AST do not match')
    }
    if (expression.resultType !== 'boolean') errors.push('Visibility result type must be boolean')
  } catch (cause) {
    errors.push(cause instanceof Error ? cause.message : String(cause))
  }
  return [...new Set(errors)]
}
