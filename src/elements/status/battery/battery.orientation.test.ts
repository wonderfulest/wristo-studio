import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBattery, updateBattery } from './battery.renderer'
import { decodeBattery, encodeBattery } from './battery.encoder'

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

const vertical = {
  id: 'battery', eleType: 'battery' as const, left: 120, top: 130,
  originX: 'center' as const, originY: 'center' as const,
  orientation: 'vertical' as const, width: 20, height: 40,
  headWidth: 10, headHeight: 4, padding: 2, headGap: 1,
}

describe('battery direction', () => {
  beforeEach(() => elements.clear())

  it.each([0, 0.2, 0.5, 1])('fills a vertical battery from its bottom at %s and survives reload', (level) => {
    const element: any = createBattery({ ...vertical, level } as any)
    const body = element._body
    const fill = element._level
    const head = element._head
    expect(fill.width).toBe(16)
    expect(fill.height).toBeCloseTo(36 * level)
    expect(fill.top + fill.height).toBeCloseTo(body.top + 18)
    expect(head.top).toBeLessThan(body.top - 20)
    expect(head.left).toBeCloseTo(body.left)
    const saved = encodeBattery(element)
    expect(saved).toMatchObject({ orientation: 'vertical', level, left: 120, top: 130 })
    const reloaded: any = createBattery(decodeBattery(saved) as any)
    expect(encodeBattery(reloaded)).toMatchObject({ orientation: 'vertical', level, width: 20, height: 40 })
  })

  it('uses the whole battery center for the saved position, matching device geometry', () => {
    const element: any = createBattery({ ...vertical, bodyStrokeWidth: 2, level: 0.5 })
    expect(element._body.getCenterPoint()).toMatchObject({ x: 120, y: 132 })
    expect(element._head.getBoundingRect()).toMatchObject({ left: 115, top: 107, width: 10, height: 4 })
    expect(element._level.getBoundingRect()).toMatchObject({ left: 112, top: 132, width: 16, height: 18 })
  })

  it('keeps horizontal defaults for old designs', () => {
    const element: any = createBattery({ ...vertical, orientation: undefined, level: 0.5 } as any)
    expect(element._level.width).toBe(8)
    expect(element._level.height).toBe(36)
    expect(encodeBattery(element)).toMatchObject({ orientation: 'horizontal', level: 0.5 })
  })

  it('updates direction, bounds and charge without moving the element', () => {
    const element: any = createBattery({ ...vertical, orientation: 'horizontal', width: 40, height: 20, level: 0.5 } as any)
    updateBattery(element, { ...vertical, level: 0.25 } as any)
    expect(element._level.height).toBe(9)
    expect(element._level.width).toBe(16)
    expect(element.height).toBeGreaterThan(40)
    expect(element.width).toBeLessThan(element.height)
    expect(encodeBattery(element)).toMatchObject({ orientation: 'vertical', left: 120, top: 130, level: 0.25 })
    updateBattery(element, { level: 1 })
    expect(element._level.height).toBe(36)
    updateBattery(element, { orientation: 'horizontal', width: 40, height: 20, headWidth: 4, headHeight: 10 } as any)
    expect(element._level.width).toBe(36)
    expect(element._level.height).toBe(16)
    expect(element._head.left).toBeGreaterThan(element._body.left + 40)
    expect(encodeBattery(element)).toMatchObject({ orientation: 'horizontal', level: 1, left: 120, top: 130 })
  })

  it('does not produce negative or nonfinite fills when padding consumes the interior', () => {
    const element: any = createBattery({ ...vertical, padding: 25, level: 0.5 } as any)
    expect(element._level.width).toBe(0)
    expect(element._level.height).toBe(0)
    expect(encodeBattery(element).level).toBe(0)
  })
})
