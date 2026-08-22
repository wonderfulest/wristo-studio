// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

const { canvas } = vi.hoisted(() => ({
  canvas: { getObjects: vi.fn(), requestRenderAll: vi.fn() },
}))

vi.mock('@/stores/canvasStore', () => ({ useCanvasStore: () => ({ canvas }) }))
vi.mock('@/stores/layerStore', () => ({ useLayerStore: () => ({ addLayer: vi.fn() }) }))
vi.mock('@/utils/controlManager', () => ({ applyControlsToObject: vi.fn() }))

import { Group, Image, Rect, Text } from 'fabric'
import { updateWeather } from './weather.renderer'

describe('weather canvas bounds with real Fabric layout', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps a 42px square selection when replacing the font glyph with an SVG preview', async () => {
    const bounds = new Rect({
      originX: 'center', originY: 'center', left: 0, top: 0,
      width: 42, height: 42, strokeWidth: 0,
    }) as Rect & { role?: string }
    bounds.role = 'glyphBounds'

    const glyph = new Text('A', {
      originX: 'center', originY: 'center', left: 0, top: 0, fontSize: 42,
    }) as Text & { role?: string }
    glyph.role = 'glyph'

    const group = new Group([bounds, glyph], {
      id: 'weather-1', left: 180, top: 120,
      originX: 'center', originY: 'center',
      iconUnicode: '101d', fontFamily: 'weather-font', fontSize: 42,
    } as any) as any
    canvas.getObjects.mockReturnValue([group])

    const preview = new Rect({
      originX: 'center', originY: 'center', left: 0, top: 0,
      width: 24, height: 24, strokeWidth: 0,
    }) as any
    preview.filters = []
    preview.applyFilters = vi.fn()
    vi.spyOn(Image, 'fromURL').mockResolvedValue(preview)

    await updateWeather(group, {
      iconUnicode: '101d',
      previewSource: '/weather/101d.svg',
      fontSize: 42,
    })

    expect(group).toMatchObject({
      left: 180,
      top: 120,
      width: 42,
      height: 42,
      scaleX: 1,
      scaleY: 1,
    })
    expect(bounds).toMatchObject({ left: 0, top: 0, width: 42, height: 42 })
    expect(preview).toMatchObject({ left: 0, top: 0 })
    expect(preview.getScaledWidth()).toBe(42)
    expect(preview.getScaledHeight()).toBe(42)
  })
})
