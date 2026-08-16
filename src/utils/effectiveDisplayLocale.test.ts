import { describe, expect, it } from 'vitest'
import { resolveDesignContentLanguage, resolveDesignEffectiveLocale } from './effectiveDisplayLocale'

describe('effective content locale', () => {
  it('uses the stored application language for preview content', () => {
    expect(resolveDesignEffectiveLocale({ appLanguage: 'eng' })).toBe('en-US')
    expect(resolveDesignContentLanguage({ appLanguage: 'eng' })).toBe('en')
    expect(resolveDesignEffectiveLocale({ appLanguage: 'zhs' })).toBe('zh-CN')
    expect(resolveDesignContentLanguage({ appLanguage: 'zhs' })).toBe('zh')
  })
})
