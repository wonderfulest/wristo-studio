import { describe, expect, it } from 'vitest'
import { resolveEffectiveDisplayLocale } from './effectiveDisplayLocale'

describe('effective display locale', () => {
  it('never changes Latin Extended locales', () => {
    expect(resolveEffectiveDisplayLocale({ locale: 'fr-FR', nonLatinLanguageSupport: false })).toBe('fr-FR')
  })

  it('keeps supported non-Latin locales when system fonts are enabled', () => {
    expect(resolveEffectiveDisplayLocale({ locale: 'zh-CN', nonLatinLanguageSupport: true, useSystemFont: true })).toBe('zh-CN')
  })

  it('falls back to English when runtime system fonts are disabled', () => {
    expect(resolveEffectiveDisplayLocale({ locale: 'zh-TW', nonLatinLanguageSupport: true, useSystemFont: false })).toBe('en-US')
  })

  it.each(['zh', 'zh-CN', 'zh-TW', 'ja', 'ja-JP'])('falls back for disabled non-Latin locale %s', (locale) => {
    expect(resolveEffectiveDisplayLocale({ locale, nonLatinLanguageSupport: false })).toBe('en-US')
  })
})
