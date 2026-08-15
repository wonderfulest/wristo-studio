export type ExpressionValueType = 'number' | 'string' | 'boolean' | 'color' | 'asset' | 'theme' | 'null'
export type DynamicTarget = 'visibility' | 'color' | 'content' | 'image' | 'theme'

export interface ExpressionTokenDefinition {
  id: string
  code: string
  label: string
  labelCn: string
  valueType: Exclude<ExpressionValueType, 'null'>
  nullable: boolean
  unit?: string
  exampleValue: unknown
  source: 'metric' | 'system' | 'property' | 'wristo'
  supportedTargets: DynamicTarget[]
  updateFrequency: 'second' | 'minute' | 'event' | 'network'
  wfbEquivalent?: string
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
