// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { canvas, originalTextRender } = vi.hoisted(() => {
  const canvas: any = {
    objects: [] as any[],
    add(object: any) { object.canvas = canvas; canvas.objects.push(object) },
    getObjects() { return canvas.objects },
    setActiveObject: vi.fn(), renderAll: vi.fn(), requestRenderAll: vi.fn(),
  }
  return { canvas, originalTextRender: vi.fn() }
})

vi.mock('fabric', () => {
  class FabricText {
    [key: string]: any
    _renderText = originalTextRender
    constructor(public text: string, options: Record<string, any> = {}) { Object.assign(this, options) }
    set(values: Record<string, any> | string, value?: any) {
      if (typeof values === 'string') this[values] = value
      else Object.assign(this, values)
      return this
    }
    initDimensions() {}
    setCoords() {}
  }
  return { FabricText }
})

vi.mock('@/stores/canvasStore', () => ({ useCanvasStore: () => ({ canvas }) }))
vi.mock('@/stores/layerStore', () => ({ useLayerStore: () => ({ addLayer: vi.fn() }) }))
vi.mock('@/stores/elementDataStore', () => ({ useElementDataStore: () => ({ upsertElement: vi.fn(), patchElement: vi.fn() }) }))
vi.mock('@/utils/baselineUtil', () => ({ encodeTopBaseForElement: () => 0 }))

import { createIndicatorText } from './indicatorText.renderer'

describe('indicator bitmap font rendering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    canvas.objects = []
    originalTextRender.mockClear()
  })

  it('keeps status indicator glyphs on the bitmap-only renderer', async () => {
    const indicator: any = await createIndicatorText('bluetooth', '"', {
      id: 'bluetooth-1', eleType: 'bluetooth', left: 20, top: 30,
      originX: 'center', originY: 'center', fontFamily: 'qiwei-two',
      fontSize: 24, fill: '#fff',
    } as any)

    indicator._renderText({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D)

    expect(originalTextRender).not.toHaveBeenCalled()
    expect(indicator.assetFontFamily).toBe('qiwei-two')
  })
})
