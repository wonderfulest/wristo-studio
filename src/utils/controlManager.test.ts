import { describe, expect, it, vi } from 'vitest'
import { FabricObject, Point } from 'fabric'
import dialRendererSource from '@/elements/dials/common/dial.renderer.ts?raw'
import imageRendererSource from '@/elements/decoration/image/image.renderer.ts?raw'

vi.mock('@/engine/managers/layerManager', () => ({
  bringToFront: vi.fn(),
  bringForward: vi.fn(),
  sendBackward: vi.fn(),
  sendToBack: vi.fn(),
}))

import {
  applyControlsToObject,
  applyLayerOrderControlsToObject,
  DESIGNER_CONTROL_TYPES,
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

  function getControlPosition(target: any, key: string, dim: Point) {
    const control = target.controls[key]
    return control.positionHandler(dim, [1, 0, 0, 1, 300, 300], target, control)
  }

  function attachCircularCanvas(target: any) {
    target.canvas = {
      clipPath: {
        radius: 300,
        scaleX: 1,
        scaleY: 1,
        getCenterPoint: () => new Point(300, 300),
      },
      getWidth: () => 600,
      getHeight: () => 600,
      getZoom: () => 1,
    }
  }

  function createScaleTarget() {
    const target = new FabricObject({
      width: 600,
      height: 600,
      scaleX: 2,
      scaleY: 2,
      selectable: true,
      evented: true,
      hasControls: true,
    }) as any
    target.designerControlMode = 'corner4Inset'
    target.canvas = {
      fire: vi.fn(),
      getWidth: () => 600,
      getHeight: () => 600,
      getZoom: () => 1,
      uniformScaling: true,
      uniScaleKey: 'shiftKey',
    }
    vi.spyOn(target, 'fire')
    applyControlsToObject(target)
    return target
  }

  function createScaleTransform(target: any, corner: string) {
    return {
      target,
      corner,
      ex: 570,
      ey: 570,
      originX: 'center',
      originY: 'center',
      original: { scaleX: 2, scaleY: 2 },
      scaleX: 2,
      scaleY: 2,
      width: 600,
      height: 600,
    } as any
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

  it('keeps all eight image controls inside the circular watch-face safe area', () => {
    const target = createTarget('resize8CircleInset') as any
    attachCircularCanvas(target)

    applyControlsToObject(target)

    for (const key of ['tl', 'tr', 'bl', 'br', 'mt', 'mb', 'ml', 'mr']) {
      const position = getControlPosition(target, key, new Point(800, 800))
      expect(Math.hypot(position.x - 300, position.y - 300)).toBeLessThanOrEqual(270.001)
    }
    expect(getControlPosition(target, 'mt', new Point(800, 800))).toMatchObject({ x: 300, y: 30 })
    expect(getControlPosition(target, 'mr', new Point(800, 800))).toMatchObject({ x: 570, y: 300 })
  })

  it('keeps image controls at their real positions when already inside the circle', () => {
    const target = createTarget('resize8CircleInset') as any
    attachCircularCanvas(target)

    applyControlsToObject(target)

    expect(getControlPosition(target, 'tl', new Point(200, 200))).toMatchObject({ x: 200, y: 200 })
    expect(getControlPosition(target, 'mr', new Point(200, 200))).toMatchObject({ x: 400, y: 300 })
  })

  it('keeps the full image action pills inside the circular watch face', () => {
    const target = createTarget('resize8CircleInset') as any
    attachCircularCanvas(target)

    applyControlsToObject(target)

    for (const key of ['cloneActionControl', 'deleteActionControl', 'bringToFrontControl', 'bringForwardControl', 'sendBackwardControl', 'sendToBackControl']) {
      const position = getControlPosition(target, key, new Point(800, 800))
      expect(Math.hypot(position.x - 300, position.y - 300) + Math.hypot(72, 14))
        .toBeLessThanOrEqual(300.001)
    }
  })

  it('starts a circularly inset image side drag without changing its scale', () => {
    const target = createScaleTarget()
    target.designerControlMode = 'resize8CircleInset'
    attachCircularCanvas(target)
    target.canvas.fire = vi.fn()
    applyControlsToObject(target)
    const transform = createScaleTransform(target, 'mr')
    transform.ex = 570
    transform.ey = 300

    const changed = target.controls.mr.actionHandler(
      { shiftKey: false } as PointerEvent,
      transform,
      570,
      300,
    )

    expect(changed).toBe(false)
    expect(target.scaleX).toBe(2)
    expect(target.scaleY).toBe(2)
  })

  it('resizes only image width from a circularly inset side control', () => {
    const target = createScaleTarget()
    target.designerControlMode = 'resize8CircleInset'
    attachCircularCanvas(target)
    target.canvas.fire = vi.fn()
    applyControlsToObject(target)
    const transform = createScaleTransform(target, 'mr')
    transform.ex = 570
    transform.ey = 300

    const changed = target.controls.mr.actionHandler(
      { shiftKey: false } as PointerEvent,
      transform,
      580,
      300,
    )

    expect(changed).toBe(true)
    expect(target.scaleX).toBeCloseTo(2.033333, 5)
    expect(target.scaleY).toBe(2)
  })

  it('adds a rotation handle to rotatable resize controls', () => {
    const target = createTarget('resize8Rotate') as any

    applyControlsToObject(target)

    expect(target.controls.mtr).toBeDefined()
    expect(target.controls.mtr.actionName).toBe('rotate')
    expect(target.controls.mt).toBeDefined()
  })

  it('keeps the oversized ticks action entry above the bottom-right resize control', () => {
    const target = createTarget('corner4Inset') as any
    target.canvas = { getWidth: () => 600, getHeight: () => 600 }
    applyControlsToObject(target)

    expect(getControlPosition(target, 'layerOrderControl', new Point(800, 800)))
      .toMatchObject({ x: 570, y: 540 })
  })

  it('opens the oversized ticks action menu to the left and upward', () => {
    const target = createTarget('corner4Inset') as any
    target.canvas = { getWidth: () => 600, getHeight: () => 600 }
    applyControlsToObject(target)

    expect(getControlPosition(target, 'sendToBackControl', new Point(800, 800)))
      .toMatchObject({ x: 498, y: 508 })
    expect(getControlPosition(target, 'cloneActionControl', new Point(800, 800)))
      .toMatchObject({ x: 498, y: 348 })
  })

  it('keeps the ticks action entry attached while the object is inside the safe area', () => {
    const target = createTarget('corner4Inset') as any
    target.canvas = { getWidth: () => 600, getHeight: () => 600 }
    applyControlsToObject(target)

    expect(getControlPosition(target, 'layerOrderControl', new Point(200, 200)))
      .toMatchObject({ x: 410, y: 410 })
  })

  it('keeps the regular action menu outside the object bottom-right corner', () => {
    const target = createTarget('corner4') as any
    target.canvas = { getWidth: () => 600, getHeight: () => 600 }
    applyControlsToObject(target)

    expect(getControlPosition(target, 'layerOrderControl', new Point(800, 800)))
      .toMatchObject({ x: 710, y: 710 })
    expect(getControlPosition(target, 'sendToBackControl', new Point(800, 800)))
      .toMatchObject({ x: 782, y: 678 })
  })

  it('preserves the ticks safe action menu after generic layer controls are reapplied', () => {
    const target = createTarget('corner4Inset') as any
    target.canvas = { getWidth: () => 600, getHeight: () => 600 }

    applyControlsToObject(target)
    applyLayerOrderControlsToObject(target)

    expect(getControlPosition(target, 'layerOrderControl', new Point(800, 800)))
      .toMatchObject({ x: 570, y: 540 })
    expect(getControlPosition(target, 'sendToBackControl', new Point(800, 800)))
      .toMatchObject({ x: 498, y: 508 })
  })

  it('starts a clamped corner drag without changing the current scale', () => {
    const target = createScaleTarget()

    const changed = target.controls.br.actionHandler(
      { shiftKey: false } as PointerEvent,
      createScaleTransform(target, 'br'),
      570,
      570,
    )

    expect(changed).toBe(false)
    expect(target.scaleX).toBe(2)
    expect(target.scaleY).toBe(2)
  })

  it('scales smoothly from the original size using diagonal drag distance', () => {
    const target = createScaleTarget()

    const changed = target.controls.br.actionHandler(
      { shiftKey: false } as PointerEvent,
      createScaleTransform(target, 'br'),
      580,
      580,
    )

    expect(changed).toBe(true)
    expect(target.scaleX).toBeCloseTo(2.033333, 5)
    expect(target.scaleY).toBeCloseTo(2.033333, 5)
    expect(target.canvas.fire).toHaveBeenCalledWith('object:scaling', expect.any(Object))
    expect(target.fire).toHaveBeenCalledWith('scaling', expect.any(Object))
  })

  it('uses inset corner controls throughout the shared dial renderer', () => {
    expect(dialRendererSource).not.toContain("designerControlMode: 'corner4',")
    expect(dialRendererSource.match(/designerControlMode: 'corner4Inset'/g)).toHaveLength(3)
  })

  it('uses circular inset resize controls for ordinary images', () => {
    expect(imageRendererSource).toContain("designerControlMode: 'resize8CircleInset'")
  })

  it('reapplies designer controls to moon images', () => {
    expect(DESIGNER_CONTROL_TYPES).toContain('moon')
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
