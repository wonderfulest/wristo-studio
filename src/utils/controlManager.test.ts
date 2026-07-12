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

  it('uses the shared external offset', () => {
    const target = { controls: {} as Record<string, any> }
    applyLayerOrderControlsToObject(target as any)

    expect(LAYER_ORDER_ENTRY_OFFSET).toBe(10)
    expect(target.controls.layerOrderControl.offsetX).toBe(10)
    expect(target.controls.layerOrderControl.offsetY).toBe(10)
  })

  it('exposes one entry and six labeled menu actions without standalone corner actions', () => {
    const target = { controls: {} as Record<string, any> }
    applyLayerOrderControlsToObject(target as any)

    expect(target.controls.cloneControl).toBeUndefined()
    expect(target.controls.deleteControl).toBeUndefined()
    expect(target.controls.layerOrderControl.actionName).toBe('objectActions')
    expect(Object.keys(target.controls)).toEqual(expect.arrayContaining([
      'cloneActionControl',
      'deleteActionControl',
      'bringToFrontControl',
      'bringForwardControl',
      'sendBackwardControl',
      'sendToBackControl',
    ]))

    const menuControls = [
      target.controls.cloneActionControl,
      target.controls.deleteActionControl,
      target.controls.bringToFrontControl,
      target.controls.bringForwardControl,
      target.controls.sendBackwardControl,
      target.controls.sendToBackControl,
    ]
    expect(menuControls.every((control) => control.sizeX === 144)).toBe(true)
    expect(menuControls.every((control) => control.sizeY === 28)).toBe(true)
    expect(menuControls.every((control) => control.touchSizeX === 144)).toBe(true)
    expect(menuControls.every((control) => control.touchSizeY === 32)).toBe(true)
  })
})
