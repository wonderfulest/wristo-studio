import { describe, expect, it } from 'vitest'
import { buildGenerateDescriptionPayload } from './descriptionTemplateLanguage'

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
