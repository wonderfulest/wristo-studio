import { describe, expect, it, vi } from 'vitest'
import {
  getElementActionAvailability,
  roundElementPosition,
  toggleElementFlip,
} from './elementContextActionModel'

describe('element context actions', () => {
  it('disables mutations for a mixed selection containing a locked element', () => {
    const availability = getElementActionAvailability(
      [{ id: 'a', left: 1 }, { id: 'b', locked: true }],
      [{ id: 'global', eleType: 'global' }, { id: 'a' }, { id: 'b' }],
      true,
    )

    expect(availability).toMatchObject({
      canCopy: true,
      canPaste: true,
      canDelete: false,
      canFlip: false,
      canRound: false,
      canBringForward: false,
      canSendBackward: false,
    })
  })

  it('reports layer boundaries for a single selected element', () => {
    const objects = [
      { id: 'global', eleType: 'global' },
      { id: 'background', eleType: 'background' },
      { id: 'bottom', eleType: 'text' },
      { id: 'top', eleType: 'image' },
    ]

    expect(getElementActionAvailability([objects[2]], objects, false)).toMatchObject({
      canBringForward: true,
      canSendBackward: false,
    })
    expect(getElementActionAvailability([objects[3]], objects, false)).toMatchObject({
      canBringForward: false,
      canSendBackward: true,
    })
  })

  it('toggles the requested flip axis without moving the element', () => {
    const set = vi.fn()
    const setCoords = vi.fn()
    const element = { left: 11.25, top: 19.75, flipX: false, flipY: true, set, setCoords }

    toggleElementFlip(element, 'horizontal')

    expect(set).toHaveBeenCalledWith({ flipX: true })
    expect(element.left).toBe(11.25)
    expect(element.top).toBe(19.75)
    expect(setCoords).toHaveBeenCalled()
  })

  it('rounds canvas coordinates and keeps topBase aligned with top', () => {
    const set = vi.fn()
    const setCoords = vi.fn()
    const element = { left: 10.4, top: 20.6, topBase: 30.25, set, setCoords }

    const patch = roundElementPosition(element)

    expect(patch).toEqual({ left: 10, top: 21, topBase: 30.65 })
    expect(set).toHaveBeenCalledWith(patch)
    expect(setCoords).toHaveBeenCalled()
  })
})
