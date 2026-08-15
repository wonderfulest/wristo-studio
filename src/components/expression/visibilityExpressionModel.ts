import { parseExpression } from '@/engine/expression/parser'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import { inferExpressionType } from '@/engine/expression/typeChecker'
import type { DynamicValue } from '@/engine/expression/types'

export function createVisibilityExpression(source: string, fallback: boolean): DynamicValue<boolean> & { mode: 'expression' } {
  const expression = parseExpression(source, DEFAULT_EXPRESSION_TOKEN_CATALOG)
  inferExpressionType(expression.ast, DEFAULT_EXPRESSION_TOKEN_CATALOG, 'boolean')
  return { mode: 'expression', expression, fallback }
}
