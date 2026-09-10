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
  it('settles a failed Fabric 6 image load so queued WRT imports can continue', async () => {
    const error = new Error('fabric: Error loading missing.png')
    const setSrc = vi.fn()
      .mockRejectedValueOnce(error)
      .mockImplementation(() => new Promise(() => {}))
    const background: Record<string, any> = {
      id: 'background', eleType: 'background',
      wristoImageUrl: DEFAULT_BACKGROUND_IMAGE_URL,
      setSrc,
      set(values: Record<string, unknown>) { Object.assign(this, values) },
      setCoords: vi.fn(),
    }
    useCanvasStore().canvas = {
      getObjects: () => [background], moveObjectTo: vi.fn(), requestRenderAll: vi.fn(),
    } as any
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const result = await Promise.race([
        updateBackground(background as any, { imageUrl: 'https://example.com/missing.png' }).then(() => 'settled'),
        new Promise(resolve => setTimeout(() => resolve('blocked'), 50)),
      ])
      expect(result).toBe('settled')
      expect(setSrc).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith('[Background] reload failed', error)
      expect(background.wristoImageUrl).toBe(DEFAULT_BACKGROUND_IMAGE_URL)
      setSrc.mockResolvedValueOnce(undefined)
      await updateBackground(background as any, { imageUrl: 'https://example.com/large.png' })
      expect(background.wristoImageUrl).toBe('https://example.com/large.png')
      expect(setSrc).toHaveBeenCalledTimes(2)
    } finally { warn.mockRestore() }
  })

})
