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

  it('rejects the legacy code and identity', () => {
    expect(catalog.getByCode('dt5')).toBeUndefined()
    expect(catalog.getById('date.dayOfWeek')).toBeUndefined()
    expect(() => parseExpression('(dt5) == (tm5)', catalog)).toThrow()
    expect(validateTokenTemplate('(dt5)').length).toBeGreaterThan(0)
  })

  it.each([1, 2, 3, 4, 5, 6, 7])('preserves weekday value %i in canonical templates', (day) => {
    const date = new Date(2026, 8, 5 + day, 12)
    expect(resolveTokenTemplate('(tm5)', date)).toBe(String(day))
  })
})
