// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia'
import { shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useVisualThemeStore } from '@/stores/visualThemeStore'
import BackgroundPanel from './background.panel.vue'

vi.mock('@/stores/baseStore', () => ({
  useBaseStore: () => ({ appId: 42 }),
}))

describe('background.panel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('keeps the default visual theme background in sync after replacing the design background', async () => {
    const visualThemeStore = useVisualThemeStore()
    visualThemeStore.hydrate({
      version: 1,
      enabled: true,
      defaultThemeId: 'default',
      selectionMode: 'user',
      themes: [
        {
          id: 'default',
          name: 'Default',
          assets: {
            background: { assetId: 10, imageUrl: 'https://cdn.example/old-background.png' },
          },
          colors: {},
        },
        {
          id: 'night',
          name: 'Night',
          assets: {
            background: { assetId: 20, imageUrl: 'https://cdn.example/night-background.png' },
          },
          colors: {},
        },
      ],
    })

    const wrapper = shallowMount(BackgroundPanel, {
      props: {
        config: {
          id: 'background',
          eleType: 'background',
          imageId: 10,
          imageUrl: 'https://cdn.example/old-background.png',
        },
        applyPatch: vi.fn(),
      },
    })

    wrapper.findComponent({ name: 'ImageUpload' }).vm.$emit('uploaded', {
      id: 99,
      url: 'https://cdn.example/new-background.png',
    })
    await wrapper.vm.$nextTick()

    expect(visualThemeStore.config?.themes[0].assets.background).toEqual({
      assetId: 99,
      imageUrl: 'https://cdn.example/new-background.png',
    })
    expect(visualThemeStore.config?.themes[1].assets.background).toEqual({
      assetId: 20,
      imageUrl: 'https://cdn.example/night-background.png',
    })
  })

  it('applies a selected background color to the background element', async () => {
    const applyPatch = vi.fn()
    const wrapper = shallowMount(BackgroundPanel, {
      props: {
        config: {
          id: 'background',
          eleType: 'background',
          color: '#000000',
          imageUrl: '',
        },
        applyPatch,
      },
    })

    wrapper.findComponent({ name: 'ColorPicker' }).vm.$emit('property-change', {
      color: '#123456',
      propertyKey: null,
    })
    await wrapper.vm.$nextTick()

    expect(applyPatch).toHaveBeenCalledWith({ color: '#123456', colorProperty: null })
  })
})
