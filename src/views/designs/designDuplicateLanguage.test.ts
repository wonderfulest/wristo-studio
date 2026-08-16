import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import {
  canChooseDuplicateLanguage,
  getDuplicateSourceLanguage,
  withDuplicateLanguage,
} from './designDuplicateLanguage'

describe('design duplicate language', () => {
  it('normalizes the source application language from object or JSON config', () => {
    expect(getDuplicateSourceLanguage({ localization: { appLanguage: 'zhs' } })).toBe('zhs')
    expect(getDuplicateSourceLanguage('{"localization":{"appLanguage":"zh"}}')).toBe('zhs')
    expect(getDuplicateSourceLanguage(null)).toBe('eng')
  })

  it('changes only the application language on the copied config', () => {
    const source = {
      canvas: { width: 454 },
      localization: { appLanguage: 'eng' },
    }

    expect(withDuplicateLanguage(source, 'zhs')).toEqual({
      canvas: { width: 454 },
      localization: { appLanguage: 'zhs' },
    })
    expect(source.localization.appLanguage).toBe('eng')
  })

  it('changes the language when the copied config is a Vue reactive proxy', () => {
    const source = reactive({
      canvas: { width: 454 },
      localization: { appLanguage: 'eng' },
    })

    expect(withDuplicateLanguage(source, 'zhs')).toEqual({
      canvas: { width: 454 },
      localization: { appLanguage: 'zhs' },
    })
    expect(source.localization.appLanguage).toBe('eng')
  })

  it('offers a language choice only when duplicating an English application', () => {
    expect(canChooseDuplicateLanguage({ localization: { appLanguage: 'eng' } })).toBe(true)
    expect(canChooseDuplicateLanguage({ localization: { appLanguage: 'zhs' } })).toBe(false)
  })
})
