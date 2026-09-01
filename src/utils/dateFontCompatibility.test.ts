import { describe, expect, it } from 'vitest'
import { DateFormatConstants } from '@/config/elements/options/dateFormats'

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  },
  configurable: true,
})

describe('date font compatibility', () => {
  it('classifies the four-digit year preset as numeric content', async () => {
    const { getDateContentLanguage } = await import('./dateFontCompatibility')
    expect(getDateContentLanguage(DateFormatConstants.YEAR)).toBe('numeric')
  })
})
