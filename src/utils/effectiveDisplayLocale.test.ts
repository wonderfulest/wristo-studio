import { describe, expect, it } from 'vitest'
import { resolveDesignContentLanguage, resolveDesignEffectiveLocale } from './effectiveDisplayLocale'

describe('effective content locale', () => {
  it('uses Simplified Chinese only when Chinese content is enabled', () => {
    expect(resolveDesignEffectiveLocale({ supportsChineseContent: true, defaultLocale: 'en-US' })).toBe('zh-CN')
    expect(resolveDesignContentLanguage({ supportsChineseContent: true, defaultLocale: 'en-US' })).toBe('zh')
  })

  it('keeps the design locale otherwise', () => {
    expect(resolveDesignEffectiveLocale({ supportsChineseContent: false, defaultLocale: 'en-US' })).toBe('en-US')
  })
})
