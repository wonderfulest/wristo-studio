// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { translate } from './i18n'

describe('visual theme translations', () => {
  it('uses locale-specific Studio copy for English, Simplified Chinese, and Traditional Chinese', () => {
    expect(translate('visualTheme.title', 'en')).toBe('Visual Themes')
    expect(translate('visualTheme.title', 'zh')).toBe('视觉主题')
    expect(translate('visualTheme.title', 'zh-tw')).toBe('視覺主題')
    expect(translate('visualTheme.deleteConfirm', 'zh', { name: '夜间' })).toBe('确定删除主题“夜间”吗？')
    expect(translate('visualTheme.deleteConfirm', 'zh-tw', { name: '夜間' })).toBe('確定刪除主題「夜間」嗎？')
    expect(translate('visualTheme.moveUpAria', 'en', { name: 'Night' })).toBe('Move theme Night up')
    expect(translate('visualTheme.moveUpAria', 'zh', { name: '夜间' })).toBe('将主题夜间上移')
    expect(translate('visualTheme.moveUpAria', 'zh-tw', { name: '夜間' })).toBe('將主題夜間上移')
  })
})
