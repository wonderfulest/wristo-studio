import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDesignStore } from '@/stores/designStore'

describe('single application language persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stores three-letter application languages and normalizes legacy two-letter values', () => {
    const store = useDesignStore()
    store.setAppLanguage('zhs')
    expect(store.getLocalizationConfig()).toEqual({
      appLanguage: 'zhs',
    })

    store.setAppLanguage('zh' as any)
    expect(store.getLocalizationConfig()).toEqual({ appLanguage: 'zhs' })

    store.setAppLanguage('en' as any)
    expect(store.getLocalizationConfig()).toEqual({ appLanguage: 'eng' })

    store.setAppLanguage('invalid' as any)
    expect(store.getLocalizationConfig()).toEqual({ appLanguage: 'eng' })
  })
})
