import { describe, expect, it, vi } from 'vitest'

vi.mock('@/engine/managers/layerManager', () => ({
  bringToFront: vi.fn(),
  bringForward: vi.fn(),
  sendBackward: vi.fn(),
  sendToBack: vi.fn(),
}))

import {
  applyLayerOrderControlsToObject,
  LAYER_ORDER_ENTRY_OFFSET,
  LAYER_ORDER_MENU_CONTROL_SIZE,
  LAYER_ORDER_MENU_FONT_SIZE,
  LAYER_ORDER_MENU_TOUCH_SIZE,
} from './controlManager'

describe('applyLayerOrderControlsToObject', () => {
  it('adds layer controls without replacing element-specific controls', () => {
    const customControl = { name: 'endpoint' }
    const target = {
      controls: { endpoint: customControl },
    }

    applyLayerOrderControlsToObject(target as any)

    expect(target.controls.endpoint).toBe(customControl)
    expect(Object.keys(target.controls)).toEqual(expect.arrayContaining([
      'layerOrderControl',
      'bringToFrontControl',
      'bringForwardControl',
      'sendBackwardControl',
      'sendToBackControl',
    ]))
  })

  it('uses the shared external offset and enlarged menu controls', () => {
    const target = { controls: {} as Record<string, any> }
    applyLayerOrderControlsToObject(target as any)

    expect(LAYER_ORDER_ENTRY_OFFSET).toBe(10)
    expect(LAYER_ORDER_MENU_CONTROL_SIZE).toBe(16)
    expect(LAYER_ORDER_MENU_FONT_SIZE).toBe(14)
    expect(LAYER_ORDER_MENU_TOUCH_SIZE).toBe(32)
    expect(target.controls.layerOrderControl.offsetX).toBe(10)
    expect(target.controls.layerOrderControl.offsetY).toBe(10)
    expect(target.controls.bringForwardControl.sizeX).toBe(16)
    expect(target.controls.bringForwardControl.sizeY).toBe(16)
    expect(target.controls.bringForwardControl.touchSizeX).toBe(32)
    expect(target.controls.bringForwardControl.touchSizeY).toBe(32)
  })
})
