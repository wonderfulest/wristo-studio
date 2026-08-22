import { describe, expect, it, vi } from 'vitest'

const { canvas } = vi.hoisted(() => ({
  canvas: { getObjects: vi.fn(), requestRenderAll: vi.fn(), renderAll: vi.fn() },
}))

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
  class Image extends FabricObject {}
  class BlendColor {
    constructor(options: Record<string, any>) { Object.assign(this, options) }
  }
  ;(Image as any).fromURL = vi.fn(async (url: string) => {
    const image = new Image({ sourceUrl: url, width: 24, height: 24, filters: [] }) as any
    image.applyFilters = vi.fn()
    image.scaleToWidth = vi.fn((width: number) => { image.scaleX = width / image.width })
    image.scaleToHeight = vi.fn((height: number) => { image.scaleY = height / image.height })
    return image
  })
  class Rect extends FabricObject {}
  class Text extends FabricObject {
    initDimensions = vi.fn()
    constructor(public text: string, options: Record<string, any> = {}) { super(options) }
  }
  class Group extends FabricObject {
    objects: any[]
    triggerLayout = vi.fn()
    constructor(objects: any[] = [], options: Record<string, any> = {}) { super(options); this.objects = [...objects] }
    getObjects() { return this.objects }
    add(child: any) { this.objects.push(child) }
    remove(child: any) { this.objects = this.objects.filter((item) => item !== child) }
    on() {}
  }
  return { Group, Image, Rect, Text, filters: { BlendColor } }
})

vi.mock('@/stores/canvasStore', () => ({ useCanvasStore: () => ({ canvas }) }))
vi.mock('@/stores/layerStore', () => ({ useLayerStore: () => ({ addLayer: vi.fn() }) }))
vi.mock('@/utils/controlManager', () => ({ applyControlsToObject: vi.fn() }))

import { Group, Image, Rect, Text } from 'fabric'
import { updateWeather } from './weather.renderer'

describe('weather font canvas layout', () => {
  it('uses the selected weather SVG instead of a system-font fallback glyph', async () => {
    const glyph = new Text(String.fromCodePoint(0x101d), { role: 'glyph' }) as any
    const group = new Group([glyph], {
      id: 'weather-1', left: 180, top: 120, iconUnicode: '101d',
      fontFamily: 'weather-font', fontSize: 36, fill: '#FFFFFF',
    } as any) as any
    canvas.getObjects.mockReturnValue([group])

    await updateWeather(group, {
      iconUnicode: '101d',
      previewSource: '/weather/101d.svg',
      fill: '#FFFFFF',
    } as any)

    const preview = group.getObjects().find((item: any) => item.role === 'glyph')
    expect(preview).toBeInstanceOf(Image)
    expect(preview).toMatchObject({ sourceUrl: '/weather/101d.svg', weatherPreviewSource: '/weather/101d.svg' })
    expect(preview.filters[0]).toMatchObject({ color: '#FFFFFF', mode: 'tint', alpha: 1 })
  })

  it('recalculates the glyph and square group bounds without moving the weather element', async () => {
    const glyph = new Text(String.fromCodePoint(0x101d), { role: 'glyph', left: 0, top: 0 }) as any
    const group = new Group([glyph], {
      id: 'weather-1', left: 180, top: 120, iconUnicode: '101d',
      fontFamily: 'wristo-icon', fontSize: 36,
    } as any) as any
    canvas.getObjects.mockReturnValue([group])

    await updateWeather(group, { iconUnicode: '102e' })

    expect(glyph.initDimensions).toHaveBeenCalledTimes(1)
    expect(group.getObjects()).toHaveLength(2)
    const bounds = group.getObjects().find((item: any) => item.role === 'glyphBounds')
    expect(bounds).toBeInstanceOf(Rect)
    expect(bounds).toMatchObject({ width: 36, height: 36 })
    expect(glyph.left).toBeCloseTo(36 * 0.56)
    expect(glyph.top).toBe(0)
    expect(group.width).toBe(36)
    expect(group.height).toBe(36)
    expect(group.left).toBe(180)
    expect(group.top).toBe(120)
  })
})
