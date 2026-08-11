import { describe, expect, it } from 'vitest'
import { withSimplifiedChineseOptionLabel } from './propertyLocalization'

describe('withSimplifiedChineseOptionLabel', () => {
  it('uses the canonical Simplified Chinese settings label for catalog options', () => {
    expect(withSimplifiedChineseOptionLabel({
      label: 'Heart Rate',
      value: 1,
      settingsLabel: { eng: 'Heart Rate', zhs: '心率' }
    })).toMatchObject({ label: 'Heart Rate', labelCn: '心率', value: 1 })
  })

  it('uses the fixed Simplified Chinese name for standard color options', () => {
    expect(withSimplifiedChineseOptionLabel({ label: 'Dark Gray', value: '0x555555' }))
      .toEqual({ label: 'Dark Gray', labelCn: '深灰色', value: '0x555555' })
  })

  it('preserves an explicit Chinese label and falls back to English for custom options', () => {
    expect(withSimplifiedChineseOptionLabel({ label: 'Custom', labelCn: '自定义', value: 1 }).labelCn).toBe('自定义')
    expect(withSimplifiedChineseOptionLabel({ label: 'Brand Color', value: 2 }).labelCn).toBe('Brand Color')
  })
})
