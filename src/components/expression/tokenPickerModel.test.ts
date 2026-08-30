import { describe, expect, it } from 'vitest'
import { DEFAULT_EXPRESSION_TOKEN_CATALOG } from '@/engine/expression/tokenCatalog'
import { filterExpressionTokens, getReferencedTokenDefinitions } from './tokenPickerModel'

describe('expression token picker model', () => {
  it('searches by code, English, Chinese, description, and unit', () => {
    expect(filterExpressionTokens('ds9').map(({ code }) => code)).toContain('ds9')
    expect(filterExpressionTokens('heart rate').map(({ code }) => code)).toContain('ds9')
    expect(filterExpressionTokens('心率').map(({ code }) => code)).toContain('ds9')
    expect(filterExpressionTokens('当前天气').map(({ code }) => code)).toContain('w10')
    expect(filterExpressionTokens('m/s').map(({ code }) => code)).toContain('w12')
  })

  it.each(['xinlv', 'xl'])('searches Chinese token text by pinyin query %s', (query) => {
    expect(filterExpressionTokens(query).map(({ code }) => code)).toContain('ds9')
  })

  it('does not treat pinyin separators as an empty query that matches every token', () => {
    expect(filterExpressionTokens('___')).toEqual([])
  })

  it('hides Chinese-only tokens from English designs', () => {
    expect(filterExpressionTokens('', 'zhs').map(({ code }) => code)).toContain('cn1')
    expect(filterExpressionTokens('', 'eng').map(({ code }) => code)).not.toContain('cn1')
  })

  it('returns referenced definitions once in source order', () => {
    expect(getReferencedTokenDefinitions('(ai12) >= (ai13) && (ai12) > 0').map(({ code }) => code))
      .toEqual(['ai12', 'ai13'])
  })

  it('ignores unknown codes while an expression is being edited', () => {
    expect(getReferencedTokenDefinitions('(ds999) > 0')).toEqual([])
    expect(DEFAULT_EXPRESSION_TOKEN_CATALOG.getByCode('ds999')).toBeUndefined()
  })
})
