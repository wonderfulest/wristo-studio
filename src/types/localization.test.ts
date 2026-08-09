import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { normalizeNonLatinLanguageSupport } from './localization'
import { useDesignStore } from '@/stores/designStore'

describe('non-Latin language support persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('defaults missing and invalid legacy values to enabled', () => {
    expect(normalizeNonLatinLanguageSupport(undefined)).toBe(true)
    expect(normalizeNonLatinLanguageSupport('false')).toBe(true)
    expect(normalizeNonLatinLanguageSupport(false)).toBe(false)
  })

  it('exports an explicit disabled capability even without font roles', () => {
    const store = useDesignStore()
    store.setNonLatinLanguageSupport(false)
    expect(store.getLocalizationConfig()).toMatchObject({
      nonLatinLanguageSupport: false,
    })
  })
})
