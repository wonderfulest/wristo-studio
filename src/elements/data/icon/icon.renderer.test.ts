// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { canvas, originalTextRender, upsertElement } = vi.hoisted(() => {
  const canvas: any = {
    objects: [] as any[],
    add(object: any) { object.canvas = canvas; canvas.objects.push(object) },
    getObjects() { return canvas.objects },
    setActiveObject: vi.fn(),
    renderAll: vi.fn(),
    requestRenderAll: vi.fn(),
  }
  return { canvas, originalTextRender: vi.fn(), upsertElement: vi.fn() }
})

vi.mock('fabric', () => {
  class FabricObject {
    [key: string]: any
    constructor(options: Record<string, any> = {}) { Object.assign(this, options) }
    set(values: Record<string, any> | string, value?: any) {
      if (typeof values === 'string') this[values] = value
      else Object.assign(this, values)
      return this
    }
    setCoords() {}
  }
  class FabricText extends FabricObject {
    _renderText = originalTextRender
    text: string
    constructor(text: string, options: Record<string, any> = {}) { super(options); this.text = text }
    initDimensions() {}
  }
  class FabricImage extends FabricObject {}
  return { FabricObject, FabricText, Image: FabricImage }
})

vi.mock('@/stores/canvasStore', () => ({ useCanvasStore: () => ({ canvas, setActiveIds: vi.fn(), activeIds: [] }) }))
vi.mock('@/stores/layerStore', () => ({ useLayerStore: () => ({ previewMode: 'active', addLayer: vi.fn(), selectOne: vi.fn(), selectedLayerIds: [] }) }))
vi.mock('@/stores/properties', () => ({ usePropertiesStore: () => ({ getMetricByOptions: () => ({ metricSymbol: ':FIELD_TYPE_PRECIPITATION_CHANCE_CURRENT', iconUnicode: '0067' }) }) }))
vi.mock('@/stores/elementDataStore', () => ({ useElementDataStore: () => ({ upsertElement, patchElement: vi.fn() }) }))
vi.mock('@/utils/controlManager', () => ({ applyControlsToObject: vi.fn() }))
vi.mock('@/utils/baselineUtil', () => ({ encodeTopBaseForElement: () => 0 }))

import { createIcon, updateIcon } from './icon.renderer'

describe('icon bitmap font rendering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    canvas.objects = []
    originalTextRender.mockClear()
    upsertElement.mockClear()
  })

  it('renders precipitation icons in bitmap-only mode instead of falling back to TTF text', async () => {
    const icon: any = await createIcon({
      id: 'precipitation-icon', eleType: 'icon', left: 10, top: 20,
      fontFamily: 'qiwei-two', fontSize: 30, fill: '#fff',
      dataProperty: 'data_1', metricSymbol: ':FIELD_TYPE_PRECIPITATION_CHANCE_CURRENT',
      iconDisplayType: 'mip',
    } as any)

    icon._renderText({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D)

    expect(icon.text).toBe('g')
    expect(originalTextRender).not.toHaveBeenCalled()
    expect(icon.assetFontFamily).toBe('qiwei-two')
  })

  it('keeps the current AMOLED image when the panel reapplies the same asset config', async () => {
    const icon: any = {
      id: 'battery-icon',
      eleType: 'icon',
      type: 'image',
      left: 80,
      top: 120,
      fontSize: 36,
      iconSize: 36,
      iconDisplayType: 'amoled',
      amoledImageUrl: 'blob:https://studio.wristo.io/battery',
      amoledIconUnicode: '0063',
      set(key: string | Record<string, any>, value?: any) {
        if (typeof key === 'string') this[key] = value
        else Object.assign(this, key)
        return this
      },
      setCoords: vi.fn(),
    }
    canvas.objects = [icon]

    await updateIcon(icon, {
      left: 96,
      iconDisplayType: 'amoled',
      amoledImageUrl: 'blob:https://studio.wristo.io/battery',
      amoledIconUnicode: '0063',
      width: 36,
      height: 36,
    })

    expect(canvas.objects).toEqual([icon])
    expect(icon.left).toBe(96)
  })
})
