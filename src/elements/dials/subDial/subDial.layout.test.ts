import { describe, expect, it } from 'vitest'
import type { SubDialContentConfig } from '@/types/elements/subDial'
import { subDialSchema } from './subDial.schema'
import { applySubDialLayoutPreset, canvasToLocal, constrainContentPosition, localToCanvas, lockDragAxis } from './subDial.layout'

const cloneContent = (): SubDialContentConfig => JSON.parse(JSON.stringify(subDialSchema.defaultConfig.content))

describe('subDial layout', () => {
  it('round-trips normalized coordinates through a 30 degree group rotation', () => {
    const transform = { centerX: 120, centerY: 80, radius: 48, rotation: 30 }
    const local = { x: 0.35, y: -0.6 }
    const canvas = localToCanvas(local, transform)
    expect(canvasToLocal(canvas, transform).x).toBeCloseTo(local.x, 12)
    expect(canvasToLocal(canvas, transform).y).toBeCloseTo(local.y, 12)
  })

  it('keeps an item bounding box fully inside the dial circle without mutating input', () => {
    const target = { x: 1, y: 0 }
    expect(constrainContentPosition(target, { width: 24, height: 32 }, 50)).toEqual({ x: 0.6, y: 0 })
    expect(target).toEqual({ x: 1, y: 0 })
  })

  it('places oversized items at the center', () => {
    expect(constrainContentPosition({ x: 0.4, y: -0.8 }, { width: 80, height: 80 }, 50)).toEqual({ x: 0, y: 0 })
  })

  it('locks shift-drag to the larger displacement axis and uses horizontal for ties', () => {
    const start = { x: 2, y: 3 }
    expect(lockDragAxis(start, { x: 8, y: 7 }, false)).toEqual({ x: 8, y: 7 })
    expect(lockDragAxis(start, { x: 8, y: 7 }, true)).toEqual({ x: 8, y: 3 })
    expect(lockDragAxis(start, { x: 5, y: 6 }, true)).toEqual({ x: 5, y: 3 })
    expect(lockDragAxis(start, { x: 3, y: -5 }, true)).toEqual({ x: 2, y: -5 })
  })

  it('applies the approved classic layout', () => {
    const content = cloneContent()
    content.icon.x = 0.9
    content.value.visible = false
    const result = applySubDialLayoutPreset(content, 'classic')
    for (const key of Object.keys(content) as Array<keyof SubDialContentConfig>) {
      expect(result[key]).toMatchObject({ x: subDialSchema.defaultConfig.content[key].x, y: subDialSchema.defaultConfig.content[key].y, visible: subDialSchema.defaultConfig.content[key].visible })
    }
  })

  it('applies compact and goal-focused fixed layouts', () => {
    const content = cloneContent()
    const compact = applySubDialLayoutPreset(content, 'compact')
    const goalFocus = applySubDialLayoutPreset(content, 'goalFocus')
    expect(compact.icon).toMatchObject({ x: -0.38, y: -0.36, visible: true })
    expect(compact.value).toMatchObject({ x: 0, y: 0, visible: true })
    expect(compact.label).toMatchObject({ x: 0, y: 0.46, visible: true })
    expect(compact.unit.visible).toBe(false)
    expect(compact.goalValue.visible).toBe(false)
    expect(compact.percentage.visible).toBe(false)
    expect(goalFocus.icon.visible).toBe(false)
    expect(goalFocus.label).toMatchObject({ x: 0, y: -0.5, visible: true })
    expect(goalFocus.value).toMatchObject({ x: 0, y: -0.08, visible: true })
    expect(goalFocus.goalValue).toMatchObject({ x: -0.3, y: 0.48, visible: true })
    expect(goalFocus.percentage).toMatchObject({ x: 0.3, y: 0.48, visible: true })
  })

  it('preserves style and formatting fields and returns deeply independent items', () => {
    const content = cloneContent()
    Object.assign(content.value, { color: '#123456', font: 'Custom', prefix: '$', suffix: ' km', decimals: 2 })
    content.icon.displayType = 'amoled'
    const result = applySubDialLayoutPreset(content, 'compact')
    expect(result.value).toMatchObject({ color: '#123456', font: 'Custom', prefix: '$', suffix: ' km', decimals: 2 })
    expect(result.icon.displayType).toBe('amoled')
    expect(result).not.toBe(content)
    expect(result.value).not.toBe(content.value)
    result.value.color = '#000000'
    expect(content.value.color).toBe('#123456')
  })

  it('rejects invalid transforms, points, bounds, radii, and presets', () => {
    expect(() => localToCanvas({ x: Number.NaN, y: 0 }, { centerX: 0, centerY: 0, radius: 10, rotation: 0 })).toThrow()
    expect(() => canvasToLocal({ x: 0, y: 0 }, { centerX: 0, centerY: 0, radius: 0, rotation: 0 })).toThrow()
    expect(() => constrainContentPosition({ x: 0, y: 0 }, { width: -1, height: 2 }, 10)).toThrow()
    expect(() => constrainContentPosition({ x: 0, y: 0 }, { width: 1, height: 2 }, 0)).toThrow()
    expect(() => lockDragAxis({ x: 0, y: 0 }, { x: Infinity, y: 0 }, true)).toThrow()
    expect(() => applySubDialLayoutPreset(cloneContent(), 'unknown' as 'classic')).toThrow()
  })
})
