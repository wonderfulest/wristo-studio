// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { translate } from './i18n'

describe('style tag translations', () => {
  it('defines English and Chinese load failures and keeps English fallback for other locales', () => {
    expect(translate('styleTags.loadFailed', 'en')).toBe('Failed to load style tags')
    expect(translate('styleTags.loadFailed', 'zh')).toBe('风格标签加载失败')
    expect(translate('styleTags.loadFailed', 'de')).toBe('Failed to load style tags')
  })
})
