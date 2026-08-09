import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDesignStore } from '@/stores/designStore'

describe('bilingual localization persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('exports content locales without font policy', () => {
    const store = useDesignStore()
    store.setSupportedLocales(['en-US', 'zh-CN'])
    expect(store.getLocalizationConfig()).toEqual({
      defaultLocale: 'en-US',
      supportedLocales: ['en-US', 'zh-CN'],
    })
  })
})
