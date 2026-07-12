import { describe, expect, it, vi } from 'vitest'
import { Point } from 'fabric'
import dialRendererSource from '@/elements/dials/common/dial.renderer.ts?raw'

vi.mock('@/engine/managers/layerManager', () => ({
  bringToFront: vi.fn(),
  bringForward: vi.fn(),
  sendBackward: vi.fn(),
  sendToBack: vi.fn(),
}))

import {
  applyControlsToObject,
  applyLayerOrderControlsToObject,
  INSET_CORNER_CONTROL_OFFSET,
  LAYER_ORDER_ENTRY_OFFSET,
} from './controlManager'

describe('applyControlsToObject', () => {
  function createTarget(mode: string) {
    return {
      designerControlMode: mode,
      selectable: true,
      evented: true,
      hasControls: true,
      set(props: Record<string, unknown>) {
        Object.assign(this, props)
      },
    }
  }

  function getControlPosition(target: any, key: 'tl' | 'tr' | 'bl' | 'br', dim: Point) {
    const control = target.controls[key]
    return control.positionHandler(dim, [1, 0, 0, 1, 300, 300], target, control)
  }

  it('clamps oversized element controls to the 30px canvas safe area', () => {
    const target = createTarget('corner4Inset') as any
    target.canvas = { getWidth: () => 600, getHeight: () => 600 }

    applyControlsToObject(target)

    expect(INSET_CORNER_CONTROL_OFFSET).toBe(30)
    expect(getControlPosition(target, 'tl', new Point(800, 800))).toMatchObject({ x: 30, y: 30 })
    expect(getControlPosition(target, 'tr', new Point(800, 800))).toMatchObject({ x: 570, y: 30 })
    expect(getControlPosition(target, 'bl', new Point(800, 800))).toMatchObject({ x: 30, y: 570 })
    expect(getControlPosition(target, 'br', new Point(800, 800))).toMatchObject({ x: 570, y: 570 })
  })

  it('keeps inset controls on their real corners while they are inside the safe area', () => {
    const target = createTarget('corner4Inset') as any
    target.canvas = { getWidth: () => 600, getHeight: () => 600 }

    applyControlsToObject(target)

    expect(getControlPosition(target, 'tl', new Point(200, 200))).toMatchObject({ x: 200, y: 200 })
    expect(getControlPosition(target, 'br', new Point(200, 200))).toMatchObject({ x: 400, y: 400 })
  })

  it('does not clamp regular corner4 controls', () => {
    const target = createTarget('corner4') as any
    target.canvas = { getWidth: () => 600, getHeight: () => 600 }

    applyControlsToObject(target)

    expect(getControlPosition(target, 'tl', new Point(800, 800))).toMatchObject({ x: -100, y: -100 })
    expect(getControlPosition(target, 'br', new Point(800, 800))).toMatchObject({ x: 700, y: 700 })
  })

  it('uses inset corner controls throughout the shared dial renderer', () => {
    expect(dialRendererSource).not.toContain("designerControlMode: 'corner4',")
    expect(dialRendererSource.match(/designerControlMode: 'corner4Inset'/g)).toHaveLength(3)
  })
})

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
