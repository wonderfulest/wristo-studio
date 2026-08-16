import { describe, expect, it } from 'vitest'
import { resolveEnumPreviewOptions } from './tokenPreviewModel'

const values = [
  { value: 0, label: 'Clear', labelCn: '晴天' },
  { value: 1, label: 'Few Clouds', labelCn: '少云' },
]

describe('resolveEnumPreviewOptions', () => {
  it('uses Chinese dictionary labels with their raw values', () => {
    expect(resolveEnumPreviewOptions(values, 'zh')).toEqual([
      { value: 0, text: '晴天 0' },
      { value: 1, text: '少云 1' },
    ])
  })

  it('uses English labels outside Chinese locales', () => {
    expect(resolveEnumPreviewOptions(values, 'en')).toEqual([
      { value: 0, text: 'Clear 0' },
      { value: 1, text: 'Few Clouds 1' },
    ])
  })
})
