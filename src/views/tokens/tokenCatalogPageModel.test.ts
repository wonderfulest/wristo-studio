import { describe, expect, it } from 'vitest'
import { createTokenCatalogPageModel } from './tokenCatalogPageModel'

describe('token catalog page model', () => {
  it('reports totals and category counts from the formal catalog', () => {
    const model = createTokenCatalogPageModel()
    expect(model.total).toBe(131)
    expect(model.filter({ category: 'all', query: 'cn' })).toHaveLength(31)
    expect(model.categories.find(({ value }) => value === 'weather')?.count).toBe(14)
    expect(model.categories.find(({ value }) => value === 'astronomy')?.count).toBe(15)
    expect(model.categories.find(({ value }) => value === 'status')?.count).toBe(4)
  })

  it('groups all unified solar and lunar tokens under astronomy', () => {
    const model = createTokenCatalogPageModel()

    expect(model.filter({ category: 'astronomy', query: '' }).map(({ code }) => code))
      .toEqual([
        'as1', 'as1.1', 'as1.2',
        'as2', 'as2.1', 'as2.2', 'as2.3', 'as2.4', 'as2.5', 'as2.6', 'as2.7',
        'as3', 'as3.1', 'as3.2', 'as3.3',
      ])
    expect(model.filter({ category: 'weather', query: '' }).map(({ code }) => code))
      .not.toContain('w13')
    expect(model.filter({ category: 'all', query: '' }).map(({ code }) => code))
      .not.toEqual(expect.arrayContaining(['tm12', 'tm12.1', 'tm12.2', 'w13', 'w13.1']))
  })

  it('identifies tokens restricted to Chinese applications', () => {
    const model = createTokenCatalogPageModel()
    expect(model.isChineseOnly(model.filter({ category: 'all', query: 'cn3.4' })[0])).toBe(true)
    expect(model.isChineseOnly(model.filter({ category: 'all', query: 'tm1' })[0])).toBe(false)
  })

  it('provides a Chinese calendar category that filters every cn token', () => {
    const model = createTokenCatalogPageModel()
    const tokens = model.filter({ category: 'chinese-calendar', query: '' })

    expect(model.categories.find(({ value }) => value === 'chinese-calendar')?.count).toBe(31)
    expect(tokens).toHaveLength(31)
    expect(tokens.every(({ code }) => code.startsWith('cn'))).toBe(true)
  })

  it('combines category and multilingual search filters', () => {
    const model = createTokenCatalogPageModel()
    expect(model.filter({ category: 'weather', query: '温度' }).map(({ code }) => code))
      .toEqual(['w03', 'w04', 'w05', 'w10', 'w10.1'])
    expect(model.filter({ category: 'all', query: 'wr.' })).toHaveLength(4)
  })

  it('formats a code for copying into an expression', () => {
    expect(createTokenCatalogPageModel().copyText('ds3')).toBe('(ds3)')
  })

  it('exposes the four stage ranges for body battery and stress', () => {
    const model = createTokenCatalogPageModel()

    expect(model.filter({ category: 'sensor', query: 'ds330.1' })[0]?.enumValues).toEqual([
      { value: 0, label: 'Exhausted (below 25)', labelCn: '疲惫（原值 < 25）' },
      { value: 1, label: 'Fair (25 to below 50)', labelCn: '一般（原值 >= 25 且 < 50）' },
      { value: 2, label: 'Good (50 to below 75)', labelCn: '良好（原值 >= 50 且 < 75）' },
      { value: 3, label: 'High (75 or above)', labelCn: '充沛（原值 >= 75）' },
    ])
    expect(model.filter({ category: 'sensor', query: 'ds331.1' })[0]?.enumValues).toEqual([
      { value: 0, label: 'Relaxed (below 25)', labelCn: '放松（原值 < 25）' },
      { value: 1, label: 'Normal (25 to below 50)', labelCn: '正常（原值 >= 25 且 < 50）' },
      { value: 2, label: 'Tense (50 to below 75)', labelCn: '紧张（原值 >= 50 且 < 75）' },
      { value: 3, label: 'High stress (75 or above)', labelCn: '高压（原值 >= 75）' },
    ])
  })

  it('exposes the four battery-stage ranges without replacing ds3', () => {
    const model = createTokenCatalogPageModel()

    expect(model.filter({ category: 'system', query: 'ds3' }).map(({ code }) => code))
      .toEqual(['ds3', 'ds3.1'])
    expect(model.filter({ category: 'system', query: 'ds3.1' })[0]?.enumValues).toEqual([
      { value: 0, label: 'Low (below 25%)', labelCn: '电量不足（原值 < 25%）' },
      { value: 1, label: 'Fair (25% to below 50%)', labelCn: '电量一般（原值 >= 25% 且 < 50%）' },
      { value: 2, label: 'Good (50% to below 75%)', labelCn: '电量良好（原值 >= 50% 且 < 75%）' },
      { value: 3, label: 'Full (75% or above)', labelCn: '电量充足（原值 >= 75%）' },
    ])
  })

  it('exposes the three precipitation-stage ranges without replacing w08', () => {
    const model = createTokenCatalogPageModel()

    expect(model.filter({ category: 'weather', query: 'w08' }).map(({ code }) => code))
      .toEqual(['w08', 'w08.1'])
    expect(model.filter({ category: 'weather', query: 'w08.1' })[0]?.enumValues).toEqual([
      { value: 0, label: 'No rain (below 30%)', labelCn: '无雨（原值 < 30%）' },
      { value: 1, label: 'Rain possible (30% to below 70%)', labelCn: '可能下雨（原值 >= 30% 且 < 70%）' },
      { value: 2, label: 'Rain likely (70% or above)', labelCn: '大概率下雨（原值 >= 70%）' },
    ])
  })
})
