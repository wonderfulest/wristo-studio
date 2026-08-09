import { describe, expect, it } from 'vitest'
import {
  containsChineseText,
  normalizeLegacyTextFont,
  resolvePreviewFontFamily,
} from './contentFontFallback'

describe('content font fallback', () => {
  it.each([
    ['', false], ['12:38', false], ['8,520 STEPS', false],
    ['星期日', true], ['步数 8,520', true], ['㐀', true], ['豈', true],
  ])('detects %s', (content, expected) => {
    expect(containsChineseText(content)).toBe(expected)
  })

  it('uses the packaged Chinese font only for Chinese content', () => {
    expect(resolvePreviewFontFamily('步数 8,520', 'Inter')).toBe('noto-sans-sc-regular')
    expect(resolvePreviewFontFamily('8,520 STEPS', 'Inter')).toBe('Inter')
  })

  it('restores a legacy asset snapshot', () => {
    expect(normalizeLegacyTextFont({
      fontSource: 'system', systemFont: 'FONT_SMALL',
      assetFontFamily: 'Inter', assetFontSize: 22,
    }, { family: 'Default', size: 18 })).toEqual({ fontFamily: 'Inter', fontSize: 22 })
  })

  it('uses the default when a legacy snapshot is absent', () => {
    expect(normalizeLegacyTextFont({ fontSource: 'system' }, { family: 'Default', size: 18 }))
      .toEqual({ fontFamily: 'Default', fontSize: 18 })
  })
})
