import { describe, expect, it } from 'vitest'
import {
  buildGenerateDescriptionPayload,
  resolveDescriptionTemplateLanguage,
} from './descriptionTemplateLanguage'

describe('buildGenerateDescriptionPayload', () => {
  it('includes the explicitly selected Chinese language', () => {
    expect(buildGenerateDescriptionPayload(7, 9, 'zh')).toEqual({
      userId: 7,
      productId: 9,
      language: 'zh',
    })
  })

  it('includes the explicitly selected English language', () => {
    expect(buildGenerateDescriptionPayload(7, 9, 'en')).toEqual({
      userId: 7,
      productId: 9,
      language: 'en',
    })
  })
})

describe('resolveDescriptionTemplateLanguage', () => {
  it('uses the Chinese template for a Simplified Chinese watchface', () => {
    expect(resolveDescriptionTemplateLanguage({ localization: { appLanguage: 'zhs' } })).toBe('zh')
  })

  it('uses the English template for an English watchface', () => {
    expect(resolveDescriptionTemplateLanguage({ localization: { appLanguage: 'eng' } })).toBe('en')
  })

  it('supports serialized config and defaults missing language to English', () => {
    expect(resolveDescriptionTemplateLanguage('{"localization":{"appLanguage":"zh"}}')).toBe('zh')
    expect(resolveDescriptionTemplateLanguage(null)).toBe('en')
  })
})
