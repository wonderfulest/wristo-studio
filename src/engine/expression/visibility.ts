import { getDisplayState, type DisplayStateMode } from '@/utils/displayStates'
import { collectTokenDependencies } from './dependencies'
import { evaluateExpression } from './evaluator'
import type { DynamicValue, ExpressionTokenValues } from './types'
import type { LayoutVisibility } from '@/types/layout'
import type { PropertiesMap } from '@/types/properties'
import { resolveLayoutVisibility } from '@/engine/services/layoutConfig'

export interface ElementVisibilityRequest {
  displayStates: unknown
  previewMode: DisplayStateMode
  visibility?: DynamicValue<boolean>
  tokenValues: ExpressionTokenValues
  layoutVisibility?: LayoutVisibility | null
  properties?: PropertiesMap
  layoutValues?: Record<string, unknown>
}

export function resolveElementVisibility(request: ElementVisibilityRequest): boolean {
  if (!getDisplayState(request.displayStates, request.previewMode)) return false
  if (!resolveLayoutVisibility(request.layoutVisibility, request.properties ?? {}, request.layoutValues)) return false
  if (!request.visibility) return true
  if (request.visibility.mode === 'literal') return request.visibility.value
  const dependencies = collectTokenDependencies(request.visibility.expression.ast)
  if ([...dependencies].some((tokenId) => !Object.prototype.hasOwnProperty.call(request.tokenValues, tokenId))) {
    return request.visibility.fallback
  }
  try {
    const result = evaluateExpression(request.visibility.expression.ast, request.tokenValues)
    return typeof result === 'boolean' ? result : request.visibility.fallback
  } catch {
    return request.visibility.fallback
  }
}
