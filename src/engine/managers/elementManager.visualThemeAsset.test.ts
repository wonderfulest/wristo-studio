import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const runtime = vi.hoisted(() => ({
  canvas: null as any,
  storedConfig: null as any,
  upsertElement: vi.fn(),
}))

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({ canvas: runtime.canvas }),
}))

vi.mock('@/stores/layerStore', () => ({
  useLayerStore: () => ({ addLayer: vi.fn(), removeLayer: vi.fn() }),
}))

vi.mock('@/stores/elementDataStore', () => ({
  useElementDataStore: () => ({
    getElementConfig: () => runtime.storedConfig,
    upsertElement: runtime.upsertElement,
    patchElement: vi.fn(),
    removeElement: vi.fn(),
  }),
}))

vi.mock('@/stores/historyStore', () => ({
  useHistoryStore: () => ({ saveState: vi.fn() }),
}))

import { registerElement } from '@/engine/registry/elementRegistry'
import { useVisualThemeStore } from '@/stores/visualThemeStore'
import { updateElement } from './elementManager'

describe('ElementManager visual-theme asset persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    runtime.upsertElement.mockReset()
  })

  it('keeps an uploaded base hand out of the currently previewed visual theme', async () => {
    const element = {
      id: 'hour-hand',
      eleType: 'hourHand',
      left: 227,
      top: 227,
      imageUrl: 'old-hour.svg',
      assetId: 12,
    }
    runtime.storedConfig = { ...element }
    runtime.canvas = {
      getObjects: () => [element],
      requestRenderAll: vi.fn(),
    }
    registerElement('hourHand', {
      add: vi.fn() as any,
      update: (target, patch) => {
        Object.assign(target, patch)
      },
      encode: target => ({ ...target }) as any,
    })

    const store = useVisualThemeStore()
    store.hydrate({
      version: 1,
      enabled: true,
      defaultThemeId: 'day',
      selectionMode: 'user',
      themes: [
        { id: 'day', name: 'Day', assets: { hourHand: { assetId: 12, imageUrl: 'old-hour.svg' } } },
        { id: 'night', name: 'Night', assets: { hourHand: { assetId: 22, imageUrl: 'night-hour.svg' } } },
      ],
    })
    store.setPreviewTheme('night')

    await updateElement(element as any, {
      imageUrl: 'uploaded-hour.svg',
      assetId: 99,
    })

    expect(runtime.upsertElement).toHaveBeenLastCalledWith(expect.objectContaining({
      assetId: 99,
      imageUrl: 'uploaded-hour.svg',
    }))
    expect(store.themes.find(theme => theme.id === 'night')?.assets.hourHand).toEqual({
      assetId: 22,
      imageUrl: 'night-hour.svg',
    })
    expect(store.themes.find(theme => theme.id === 'day')?.assets.hourHand).toEqual({
      assetId: 12,
      imageUrl: 'old-hour.svg',
    })
  })
})
