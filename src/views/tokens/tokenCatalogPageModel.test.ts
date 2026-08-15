import { describe, expect, it } from 'vitest'
import { createTokenCatalogPageModel } from './tokenCatalogPageModel'

describe('token catalog page model', () => {
  it('reports totals and category counts from the formal catalog', () => {
    const model = createTokenCatalogPageModel()
    expect(model.total).toBe(53)
    expect(model.categories.find(({ value }) => value === 'weather')?.count).toBe(10)
    expect(model.categories.find(({ value }) => value === 'status')?.count).toBe(4)
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
