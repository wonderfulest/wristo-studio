import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBattery, updateBattery } from './battery.renderer'
import { decodeBattery, encodeBattery } from './battery.encoder'
import { scaleElementConfig, scaleFabricCanvasForDesignSize } from '@/utils/designScale'

const elements = new Map<string, any>()
vi.mock('@/engine/managers/elementManager', () => ({
  registerElementInstance: (element: any) => elements.set(element.id, element),
  getElementById: (id: string) => elements.get(id),
}))
vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: () => ({ canvas: {
    add: vi.fn(), requestRenderAll: vi.fn(), discardActiveObject: vi.fn(), setActiveObject: vi.fn(),
  } }),
}))
vi.mock('@/stores/layerStore', () => ({ useLayerStore: () => ({ addLayer: vi.fn() }) }))

const config = {
  id: 'segmented-battery', eleType: 'battery' as const, left: 120, top: 130,
  originX: 'center' as const, originY: 'center' as const,
  width: 100, height: 20, padding: 2, level: 0.53,
  segmentMode: true, segments: 5, segmentGap: 2,
  levelColorHighProperty: 'chargeColor',
}

describe('segmented battery', () => {
  beforeEach(() => elements.clear())

  it('scales gaps and the live mask with the canvas but keeps the segment count', () => {
    const from = { width: 454, height: 454 }
    const to = { width: 908, height: 908 }
    expect(scaleElementConfig(config, from, to)).toMatchObject({ segmentGap: 4, segments: 5 })
    const element: any = createBattery(config)
    const clip = element._level.clipPath
    const before = { left: clip.left, top: clip.top, width: clip.width, height: clip.height }
    scaleFabricCanvasForDesignSize({ getObjects: () => [element], requestRenderAll: vi.fn() } as any, from, to)
    expect(clip.left).toBeCloseTo(before.left * 2)
    expect(clip.top).toBeCloseTo(before.top * 2)
    expect(clip.getScaledWidth()).toBeCloseTo(before.width * 2)
    expect(clip.getScaledHeight()).toBeCloseTo(before.height * 2)
  })

  it('preserves scaled fractional gaps above the panel default range through save and reload', () => {
    const scaled = scaleElementConfig({ ...config, segmentGap: 20 },
      { width: 390, height: 390 }, { width: 454, height: 454 })
    const element: any = createBattery(scaled as any)
    expect(encodeBattery(element).segmentGap).toBe(23.282)
    const reloaded: any = createBattery(decodeBattery(encodeBattery(element)) as any)
    expect(encodeBattery(reloaded).segmentGap).toBe(23.282)
    updateBattery(reloaded, { level: 0.4 })
    expect(encodeBattery(reloaded).segmentGap).toBe(23.282)
  })

  it.each(['horizontal', 'vertical'] as const)('keeps %s charge and configuration through reload and updates', (orientation) => {
    const element: any = createBattery({ ...config, orientation })
    expect(element._level.clipPath?.getObjects()).toHaveLength(5)
    const saved = encodeBattery(element)
    expect(saved).toMatchObject({ ...config, orientation })
    const reloaded: any = createBattery({ ...decodeBattery(saved), id: saved.id } as any)
    expect(encodeBattery(reloaded)).toMatchObject(saved)
    updateBattery(reloaded, { segments: 8, segmentGap: 1, level: 0.27 })
    expect(reloaded._level.clipPath.getObjects()).toHaveLength(8)
    expect(encodeBattery(reloaded)).toMatchObject({ segments: 8, segmentGap: 1, level: 0.27, left: 120, top: 130 })
    updateBattery(reloaded, { segmentMode: false })
    expect(reloaded._level.clipPath).toBeUndefined()
    expect(encodeBattery(reloaded)).toMatchObject({ segmentMode: false, segments: 8, level: 0.27 })
  })

  it.each(['horizontal', 'vertical'] as const)('spaces full slots evenly and clips the %s fill continuously', (orientation) => {
    const element: any = createBattery({ ...config, orientation, width: orientation === 'vertical' ? 20 : 100,
      height: orientation === 'vertical' ? 100 : 20, level: 0.5 })
    const fill = element._level
    const clip = fill.clipPath
    expect(clip).toBeDefined()
    const slots = clip.getObjects()
    const axis = orientation === 'vertical' ? 'height' : 'width'
    expect(fill[axis]).toBe(48)
    expect(slots.map((slot: any) => slot[axis])).toEqual(Array(5).fill(17.6))
    expect(clip.width).toBeCloseTo(orientation === 'vertical' ? 16 : 96)
    expect(clip.height).toBeCloseTo(orientation === 'vertical' ? 96 : 16)
    expect(clip.left).toBe(orientation === 'vertical' ? 0 : 24)
    expect(clip.top).toBe(orientation === 'vertical' ? -24 : 0)
    // At 50%, two full slots and half of the middle slot intersect the fill.
    const centers = slots.map((slot: any) => slot.getRelativeCenterPoint()[orientation === 'vertical' ? 'y' : 'x'])
    expect(centers[1] - centers[0]).toBeCloseTo(19.6)
  })

  it('keeps legacy designs continuous and normalizes invalid options', () => {
    const legacy: any = createBattery({ ...config, segmentMode: undefined, segments: undefined, segmentGap: undefined })
    expect(legacy._level.clipPath).toBeUndefined()
    expect(encodeBattery(legacy)).toMatchObject({ segmentMode: false, segments: 5, segmentGap: 2 })
    const invalid: any = createBattery({ ...config, segments: NaN, segmentGap: Infinity })
    expect(encodeBattery(invalid)).toMatchObject({ segments: 5, segmentGap: 2 })
    updateBattery(invalid, { segments: 1000, segmentGap: -5 })
    expect(encodeBattery(invalid)).toMatchObject({ segments: 50, segmentGap: 0 })
  })

  it.each([1, 5, 50])('keeps %s slots inside a narrow battery with an oversized gap', (segments) => {
    const element: any = createBattery({ ...config, width: 12, segments, segmentGap: 20 })
    const clip = element._level.clipPath
    expect(clip).toBeDefined()
    expect(clip.width).toBeCloseTo(8)
    for (const slot of clip.getObjects()) {
      expect(slot.width).toBeGreaterThan(0)
      expect(Number.isFinite(slot.width)).toBe(true)
    }
  })
})
