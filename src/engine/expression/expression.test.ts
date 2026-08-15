import { describe, expect, it } from 'vitest'
import { evaluateExpression } from './evaluator'
import { parseExpression } from './parser'
import { createExpressionTokenCatalog } from './tokenCatalog'
import { inferExpressionType } from './typeChecker'

describe('dynamic expressions', () => {
  const catalog = createExpressionTokenCatalog([
    {
      id: 'system.battery.level',
      code: 'ds3',
      label: 'Battery Level',
      labelCn: '电池电量',
      description: 'Remaining battery percentage',
      descriptionCn: '剩余电池百分比',
      category: 'system',
      valueType: 'number',
      nullable: false,
      unit: '%',
      exampleValue: 76,
      source: 'system',
      supportedTargets: ['visibility'],
      updateFrequency: 'minute',
      providerKey: 'systemStats',
      deviceRequirements: ['System statistics'],
      exampleExpression: '(ds3) <= 20',
      wfbEquivalent: 'ds3',
    },
    {
      id: 'system.charging',
      code: 'wr.charging',
      label: 'Charging',
      labelCn: '正在充电',
      description: 'Whether the device is charging',
      descriptionCn: '设备是否正在充电',
      category: 'status',
      valueType: 'boolean',
      nullable: false,
      exampleValue: false,
      source: 'wristo',
      supportedTargets: ['visibility'],
      updateFrequency: 'event',
      providerKey: 'systemStats',
      deviceRequirements: ['Charging status'],
      exampleExpression: '(wr.charging) == true',
    },
  ])

  it('parses a WFB-style token into a semantic token AST', () => {
    const expression = parseExpression('(ds3) <= 20', catalog)

    expect(expression.ast).toEqual({
      type: 'binary',
      operator: '<=',
      left: {
        type: 'token',
        tokenId: 'system.battery.level',
        code: 'ds3',
      },
      right: {
        type: 'literal',
        valueType: 'number',
        value: 20,
      },
    })
    expect(expression.source).toBe('(ds3) <= 20')
    expect(expression.version).toBe(1)
  })

  it('infers a battery comparison as a boolean expression', () => {
    const expression = parseExpression('(ds3) <= 20', catalog)

    expect(inferExpressionType(expression.ast, catalog)).toBe('boolean')
  })

  it('evaluates the comparison from the semantic token value', () => {
    const expression = parseExpression('(ds3) <= 20', catalog)

    expect(evaluateExpression(expression.ast, { 'system.battery.level': 15 })).toBe(true)
    expect(evaluateExpression(expression.ast, { 'system.battery.level': 76 })).toBe(false)
  })

  it('respects arithmetic and logical operator precedence', () => {
    const expression = parseExpression('(ds3) + 10 * 2 >= 40 && true', catalog)

    expect(expression.resultType).toBe('boolean')
    expect(evaluateExpression(expression.ast, { 'system.battery.level': 20 })).toBe(true)
    expect(evaluateExpression(expression.ast, { 'system.battery.level': 10 })).toBe(false)
  })

  it('evaluates only the selected conditional branch', () => {
    const expression = parseExpression('(ds3) <= 20 ? true : (wr.charging)', catalog)
    const values = new Proxy(
      { 'system.battery.level': 15 },
      {
        get(target, property: string) {
          if (property === 'system.charging') throw new Error('unselected branch evaluated')
          return target[property as keyof typeof target]
        },
      },
    )

    expect(evaluateExpression(expression.ast, values)).toBe(true)
  })

  it('supports null-safe built-in functions', () => {
    const nullableCatalog = createExpressionTokenCatalog([
      ...catalog.definitions,
      {
        id: 'weather.temperature',
        code: 'w.temp',
        label: 'Weather Temperature',
        labelCn: '天气温度',
        description: 'Current weather temperature',
        descriptionCn: '当前天气温度',
        category: 'weather',
        valueType: 'number',
        nullable: true,
        exampleValue: 18,
        source: 'weather',
        supportedTargets: ['visibility'],
        updateFrequency: 'network',
        providerKey: 'currentWeather',
        deviceRequirements: ['Toybox.Weather'],
        exampleExpression: '(w.temp) < 0',
      },
    ])
    const expression = parseExpression(
      'isnull((w.temp)) || coalesce((w.temp), 0) < 0',
      nullableCatalog,
    )

    expect(evaluateExpression(expression.ast, { 'weather.temperature': null })).toBe(true)
    expect(evaluateExpression(expression.ast, { 'weather.temperature': -5 })).toBe(true)
    expect(evaluateExpression(expression.ast, { 'weather.temperature': 18 })).toBe(false)
  })

  it('rejects an unknown token during parsing', () => {
    expect(() => parseExpression('(ds999) <= 20', catalog)).toThrow('Unknown token: (ds999)')
  })

  it('rejects a non-boolean visibility result', () => {
    const expression = parseExpression('(ds3) + 10', catalog)

    expect(() => inferExpressionType(expression.ast, catalog, 'boolean')).toThrow(
      'Expected boolean expression, received number',
    )
  })
})
