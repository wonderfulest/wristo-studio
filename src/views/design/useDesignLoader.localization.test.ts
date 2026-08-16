import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { useDesignLoader } from '@/views/design/useDesignLoader'
import { useDesignStore } from '@/stores/designStore'
import { useFontStore } from '@/stores/fontStore'
import type { RuntimeDesignConfig } from '@/types/app/config'

vi.hoisted(() => {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: storage,
    configurable: true,
  })
})

describe('useDesignLoader localization', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('restores Chinese application metadata for a newly created blank design', async () => {
    const designStore = useDesignStore()
    vi.spyOn(useFontStore(), 'fetchFonts').mockResolvedValue(undefined)
    const loader = useDesignLoader({
      canvasRef: ref(null),
      waitCanvasReady: async () => undefined,
      translate: (key) => key,
      redirectToDesigns: () => undefined,
    })

    await loader.applyRuntimeDesignConfig({
      version: '1.0',
      properties: {},
      dataOptions: {},
      designId: 'blank-design',
      name: 'Blank design',
      localization: { appLanguage: 'zhs' },
    } as RuntimeDesignConfig, 0)

    expect(designStore.getLocalizationConfig()).toEqual({ appLanguage: 'zhs' })
  })
})
