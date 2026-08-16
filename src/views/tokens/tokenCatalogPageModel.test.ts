import { describe, expect, it } from 'vitest'
import { createTokenCatalogPageModel } from './tokenCatalogPageModel'

describe('token catalog page model', () => {
  it('reports totals and category counts from the formal catalog', () => {
    const model = createTokenCatalogPageModel()
    expect(model.total).toBe(98)
    expect(model.filter({ category: 'all', query: 'cn' })).toHaveLength(32)
    expect(model.categories.find(({ value }) => value === 'weather')?.count).toBe(11)
    expect(model.categories.find(({ value }) => value === 'status')?.count).toBe(4)
  })

  it('identifies tokens restricted to Chinese applications', () => {
    const model = createTokenCatalogPageModel()
    expect(model.isChineseOnly(model.filter({ category: 'all', query: 'cn3.4' })[0])).toBe(true)
    expect(model.isChineseOnly(model.filter({ category: 'all', query: 'tm1' })[0])).toBe(false)
  })

  it('provides a Chinese calendar category that filters every cn token', () => {
    const model = createTokenCatalogPageModel()
    const tokens = model.filter({ category: 'chinese-calendar', query: '' })

    expect(model.categories.find(({ value }) => value === 'chinese-calendar')?.count).toBe(32)
    expect(tokens).toHaveLength(32)
    expect(tokens.every(({ code }) => code.startsWith('cn'))).toBe(true)
  })

  it('combines category and multilingual search filters', () => {
    const model = createTokenCatalogPageModel()
    expect(model.filter({ category: 'weather', query: '温度' }).map(({ code }) => code))
      .toEqual(['w03', 'w04', 'w05', 'w10'])
    expect(model.filter({ category: 'all', query: 'wr.' })).toHaveLength(4)
  })

  it('formats a code for copying into an expression', () => {
    expect(createTokenCatalogPageModel().copyText('ds3')).toBe('(ds3)')
  })
})
