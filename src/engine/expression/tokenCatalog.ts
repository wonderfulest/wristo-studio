import type { ExpressionTokenDefinition } from './types'

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

export const DEFAULT_EXPRESSION_TOKEN_CATALOG = createExpressionTokenCatalog([
  {
    id: 'system.battery.level',
    code: 'ds3',
    label: 'Battery Level',
    labelCn: '电池电量',
    valueType: 'number',
    nullable: false,
    unit: '%',
    exampleValue: 76,
    source: 'system',
    supportedTargets: ['visibility'],
    updateFrequency: 'minute',
    wfbEquivalent: 'ds3',
  },
])
