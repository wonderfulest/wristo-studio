import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDesignStore } from '@/stores/designStore'

describe('single application language persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stores one application language and defaults invalid legacy values to English', () => {
    const store = useDesignStore()
    store.setAppLanguage('zh')
    expect(store.getLocalizationConfig()).toEqual({
      appLanguage: 'zh',
    })

    store.setAppLanguage('zhs' as any)
    expect(store.getLocalizationConfig()).toEqual({ appLanguage: 'en' })
  })
})
