export type ExpressionValueType = 'number' | 'string' | 'boolean' | 'color' | 'asset' | 'theme' | 'null'
export type DynamicTarget = 'visibility' | 'color' | 'content' | 'image' | 'theme'
export type ExpressionTokenCategory = 'date-time' | 'activity' | 'sensor' | 'system' | 'weather' | 'status'

import type { AppLanguage } from '@/types/localization'

export interface ExpressionTokenDefinition {
  id: string
  code: string
  label: string
  labelCn: string
  description: string
  descriptionCn: string
  category: ExpressionTokenCategory
  valueType: Exclude<ExpressionValueType, 'null'>
  nullable: boolean
  unit?: string
  exampleValue: unknown
  enumValues?: Array<{ value: number; label: string; labelCn?: string }>
  source: 'time' | 'activity' | 'sensor' | 'system' | 'weather' | 'wristo'
  supportedTargets: DynamicTarget[]
  updateFrequency: 'second' | 'minute' | 'event' | 'network'
  providerKey: string
  deviceRequirements: string[]
  exampleExpression: string
  wfbEquivalent?: string
  appLanguages?: AppLanguage[]
}

export type ExpressionNode =
  | { type: 'token'; tokenId: string; code: string }
  | { type: 'literal'; valueType: ExpressionValueType; value: unknown }
  | { type: 'unary'; operator: '!'; operand: ExpressionNode }
  | {
      type: 'binary'
      operator: '<=' | '<' | '>=' | '>' | '==' | '!=' | '+' | '-' | '*' | '/' | '%' | '&&' | '||'
      left: ExpressionNode
      right: ExpressionNode
    }
  | { type: 'conditional'; condition: ExpressionNode; whenTrue: ExpressionNode; whenFalse: ExpressionNode }
  | { type: 'call'; name: 'isnull' | 'coalesce' | 'min' | 'max' | 'round'; arguments: ExpressionNode[] }

export interface TypedExpression {
  source: string
  ast: ExpressionNode
  resultType: ExpressionValueType
  version: 1
}

export type DynamicValue<T> =
  | { mode: 'literal'; value: T }
  | { mode: 'expression'; expression: TypedExpression; fallback: T }

export type ExpressionTokenValues = Readonly<Record<string, unknown>>
