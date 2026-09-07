import { describe, expect, it } from 'vitest'
import { migrateWeekdayTokens } from './weekdayTokenMigration'
import { validateVisibilityExpression } from './validation'
import { toPlainRuntimeConfig } from '@/engine/services/runtimeConfigSerialization'
import { persistAndSaveDesignConfig } from '@/engine/services/persistBlobAssetUrls'

const legacy = () => ({
  version: 1, resultType: 'boolean', source: '(dt5) == 6',
  ast: { type: 'binary', operator: '==',
    left: { type: 'token', tokenId: 'date.dayOfWeek', code: 'dt5' },
    right: { type: 'literal', valueType: 'number', value: 6 } },
})

describe('saved weekday token migration', () => {
  it('migrates nested rules, templates and theme overrides without changing literals or input', () => {
    const input = { elements: [{
      visibility: { mode: 'expression', fallback: false, expression: legacy() },
      items: [{ expression: legacy() }],
      textTemplate: '(dt5) + "(dt5)" + (dt5.1)',
      dateTemplate: '(dt5) + (dt5.2)', name: '(dt5)',
    }], visualThemes: { overrides: [{ expression: legacy() }] } }
    const result = migrateWeekdayTokens(input)
    expect(validateVisibilityExpression(result.elements[0].visibility)).toEqual([])
    expect(result.elements[0].items[0].expression.source).toBe('(tm5) == 6')
    expect(result.visualThemes.overrides[0].expression.ast.left)
      .toEqual({ type: 'token', tokenId: 'time.dayOfWeek', code: 'tm5' })
    expect(result.elements[0].textTemplate).toBe('(tm5) + "(dt5)" + (dt5.1)')
    expect(result.elements[0].dateTemplate).toBe('(tm5) + (dt5.2)')
    expect(result.elements[0].name).toBe('(dt5)')
    expect(input.elements[0].visibility.expression.source).toBe('(dt5) == 6')
    expect(migrateWeekdayTokens(result)).toEqual(result)
  })

  it('exports and saves only canonical weekday rules', async () => {
    const input = { elements: [{ visibility: { mode: 'expression', fallback: false, expression: legacy() } }] }
    const plain = toPlainRuntimeConfig(input as any)
    expect(JSON.stringify(plain)).not.toMatch(/date\.dayOfWeek|\(dt5\)/)
    let saved: unknown
    await persistAndSaveDesignConfig(input, async (config) => { saved = config })
    expect(JSON.stringify(saved)).not.toMatch(/date\.dayOfWeek|\(dt5\)/)
  })
})
