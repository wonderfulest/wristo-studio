import { describe, expect, it, vi } from 'vitest'

vi.mock('@/engine/managers/layerManager', () => ({
  bringToFront: vi.fn(),
  bringForward: vi.fn(),
  sendBackward: vi.fn(),
  sendToBack: vi.fn(),
}))

import { applyLayerOrderControlsToObject } from './controlManager'

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
})
