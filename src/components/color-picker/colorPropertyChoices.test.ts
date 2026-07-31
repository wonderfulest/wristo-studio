import { describe, expect, it, vi } from 'vitest'
import { buildColorPropertyChoices } from './colorPropertyChoices'

describe('buildColorPropertyChoices', () => {
  it('keeps global metadata while using resolved theme values', () => {
    const resolveValue = vi.fn((key: string) =>
      key === 'Primary' ? '0x112233' : '#445566')

    expect(buildColorPropertyChoices({
      Primary: { type: 'color', title: 'Primary color', value: '0xFFFFFF' },
      Surface: { type: 'color', title: 'Surface color', value: '0x000000' },
      Label: { type: 'text', title: 'Label', value: 'Text' },
    }, resolveValue)).toEqual([
      {
        name: 'Primary color',
        propertyKey: 'Primary',
        value: '0x112233',
        hex: '#112233',
      },
      {
        name: 'Surface color',
        propertyKey: 'Surface',
        value: '#445566',
        hex: '#445566',
      },
    ])

    expect(resolveValue).toHaveBeenCalledTimes(2)
  })

  it('falls back to the global property value when resolution is empty', () => {
    expect(buildColorPropertyChoices({
      Primary: { type: 'color', title: 'Primary', value: '0xABCDEF' },
    }, () => undefined)).toEqual([
      {
        name: 'Primary',
        propertyKey: 'Primary',
        value: '0xABCDEF',
        hex: '#ABCDEF',
      },
    ])
  })
})
