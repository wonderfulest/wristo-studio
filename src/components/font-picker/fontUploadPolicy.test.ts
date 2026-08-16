import { describe, expect, it } from 'vitest'
import { filterUploadFontTypes, getUploadFontLanguageOptions } from './fontUploadPolicy'

describe('font upload policy', () => {
  it('removes the Chinese text font type from upload choices', () => {
    expect(filterUploadFontTypes([
      { name: 'Text', value: 'text_font' },
      { name: 'Chinese text', value: 'text_font_zh' },
      { name: 'Number', value: 'number_font' },
    ])).toEqual([
      { name: 'Text', value: 'text_font' },
      { name: 'Number', value: 'number_font' },
    ])
  })

  it('permits only English and Chinese font languages', () => {
    expect(getUploadFontLanguageOptions()).toEqual(['en', 'zh'])
  })
})
