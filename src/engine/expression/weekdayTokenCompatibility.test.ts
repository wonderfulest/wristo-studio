import { describe, expect, it } from 'vitest'
import { filterExpressionTokens } from '@/components/expression/tokenPickerModel'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG as catalog } from './tokenCatalog'
import { parseExpression } from './parser'
import { resolveTokenTemplate, validateTokenTemplate } from './textTemplateTokens'

describe('weekday token compatibility', () => {
  it('offers only tm5 for numeric weekdays while keeping the text formats', () => {
    expect(filterExpressionTokens('星期', 'eng').map(({ code }) => code))
      .toEqual(['dt5.1', 'dt5.2', 'tm5'])
  })

  it('still resolves the legacy code and identity in saved expressions', () => {
    const legacy = catalog.getByCode('dt5')
    expect(legacy).toMatchObject({ id: 'date.dayOfWeek', code: 'dt5' })
    expect(catalog.getById('date.dayOfWeek')).toBe(legacy)
    expect(() => parseExpression('(dt5) == (tm5)', catalog)).not.toThrow()
    expect(validateTokenTemplate('(dt5)')).toEqual([])
  })

  it.each([1, 2, 3, 4, 5, 6, 7])('preserves weekday value %i in old and new templates', (day) => {
    const date = new Date(2026, 8, 5 + day, 12)
    expect(resolveTokenTemplate('(dt5)', date)).toBe(String(day))
    expect(resolveTokenTemplate('(tm5)', date)).toBe(String(day))
  })
})
