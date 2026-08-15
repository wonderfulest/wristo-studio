import { describe, expect, it } from 'vitest'
import { resolveDesignContentLanguage, resolveDesignEffectiveLocale } from './effectiveDisplayLocale'

describe('effective content locale', () => {
  it('keeps preview content English for either stored application language', () => {
    expect(resolveDesignEffectiveLocale({ appLanguage: 'en' })).toBe('en-US')
    expect(resolveDesignContentLanguage({ appLanguage: 'en' })).toBe('en')
    expect(resolveDesignEffectiveLocale({ appLanguage: 'zh' })).toBe('en-US')
    expect(resolveDesignContentLanguage({ appLanguage: 'zh' })).toBe('en')
  })
})
