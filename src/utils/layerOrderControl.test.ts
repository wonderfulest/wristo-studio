import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearExpandedLayerOrderControl,
  getExpandedLayerOrderControlId,
  getLayerOrderAvailability,
  isLayerOrderControlExpanded,
  isLayerOrderControlTarget,
  toggleExpandedLayerOrderControl,
} from './layerOrderControl'

describe('layerOrderControl', () => {
  beforeEach(() => clearExpandedLayerOrderControl())

  it('accepts only interactive ordinary elements', () => {
    expect(isLayerOrderControlTarget({ id: 'time', eleType: 'time' })).toBe(true)
    expect(isLayerOrderControlTarget({ id: 'bg', eleType: 'background' })).toBe(false)
    expect(isLayerOrderControlTarget({ id: 'global', eleType: 'global' })).toBe(false)
    expect(isLayerOrderControlTarget({ id: 'locked', eleType: 'time', locked: true })).toBe(false)
    expect(isLayerOrderControlTarget({ id: 'hidden', eleType: 'time', selectable: false })).toBe(false)
    expect(isLayerOrderControlTarget({ id: 'plain' })).toBe(false)
  })

  it('reports top and bottom availability among movable objects', () => {
    const objects = [
      { id: 'global', eleType: 'global' },
      { id: 'bg', eleType: 'background' },
      { id: 'a', eleType: 'time' },
      { id: 'b', eleType: 'date' },
      { id: 'c', eleType: 'weather' },
    ]

    expect(getLayerOrderAvailability(objects, objects[4])).toEqual({ canMoveUp: false, canMoveDown: true })
    expect(getLayerOrderAvailability(objects, objects[3])).toEqual({ canMoveUp: true, canMoveDown: true })
    expect(getLayerOrderAvailability(objects, objects[2])).toEqual({ canMoveUp: true, canMoveDown: false })
  })

  it('toggles one expanded target and clears it', () => {
    expect(toggleExpandedLayerOrderControl('a')).toBe(true)
    expect(isLayerOrderControlExpanded('a')).toBe(true)
    expect(getExpandedLayerOrderControlId()).toBe('a')
    expect(toggleExpandedLayerOrderControl('a')).toBe(false)
    expect(toggleExpandedLayerOrderControl('b')).toBe(true)
    clearExpandedLayerOrderControl()
    expect(isLayerOrderControlExpanded('b')).toBe(false)
    expect(getExpandedLayerOrderControlId()).toBeNull()
  })
})
