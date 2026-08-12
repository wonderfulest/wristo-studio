// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCanvasStore } from '@/stores/canvasStore'
import { updateBackground } from './background.renderer'
import { DEFAULT_BACKGROUND_IMAGE_URL } from './background.constants'

describe('background.renderer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('repaints the canvas background when its color changes', async () => {
    const background: Record<string, any> = {
      id: 'background',
      eleType: 'background',
      color: '#000000',
      backgroundColor: '#000000',
      wristoImageUrl: DEFAULT_BACKGROUND_IMAGE_URL,
      set(keyOrValues: string | Record<string, unknown>, value?: unknown) {
        if (typeof keyOrValues === 'string') this[keyOrValues] = value
        else Object.assign(this, keyOrValues)
      },
      setCoords: vi.fn(),
    }
    const requestRenderAll = vi.fn()
    const canvasStore = useCanvasStore()
    canvasStore.canvas = {
      getObjects: () => [background],
      moveObjectTo: vi.fn(),
      requestRenderAll,
    } as any

    await updateBackground(background as any, { color: '#123456' })

    expect(background.color).toBe('#123456')
    expect(background.backgroundColor).toBe('#123456')
    expect(requestRenderAll).toHaveBeenCalled()
  })
})
