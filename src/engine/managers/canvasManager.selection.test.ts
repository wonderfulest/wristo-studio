// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  canSaveInitialHistorySnapshot,
  resolveCanvasSelectionIds,
  resolveLayoutGroupProxyCenters,
} from './canvasManager'

describe('canvas selection ids', () => {
  it('keeps the owning hand selected when the calibration crosshair becomes active', () => {
    expect(resolveCanvasSelectionIds([
      { eleType: 'handCalibrationPivot', handId: 'rotating-hand-1' },
    ])).toEqual(['rotating-hand-1'])
  })

  it('excludes layout-group proxy ids from ordinary element selection ids', () => {
    expect(resolveCanvasSelectionIds([
      { id: 'text-1', eleType: 'text' },
      { id: 'layout-group:row-1', eleType: 'layoutGroupProxy' },
    ])).toEqual(['text-1'])
  })

  it('reads a proxy child scene center from an ActiveSelection', () => {
    const proxy = {
      eleType: 'layoutGroupProxy',
      layoutGroupId: 'row-1',
      left: -20,
      top: 5,
      getCenterPoint: () => ({ x: 145, y: 88 }),
    }
    const activeSelection = {
      type: 'ActiveSelection',
      getObjects: () => [
        { id: 'text-1', eleType: 'text' },
        proxy,
      ],
    }

    expect(resolveLayoutGroupProxyCenters(activeSelection)).toEqual([
      { groupId: 'row-1', centerX: 145, centerY: 88 },
    ])
  })
})

describe('canvas history initialization', () => {
  it('waits to save the initial snapshot until loaded layout group members exist on the canvas', () => {
    const layoutGroups = [{
      members: [
        { elementId: 'data-1' },
        { elementId: 'unit-1' },
      ],
    }]

    expect(canSaveInitialHistorySnapshot([], layoutGroups)).toBe(false)
    expect(canSaveInitialHistorySnapshot([
      { id: 'data-1' },
      { id: 'unit-1' },
    ], layoutGroups)).toBe(true)
  })
})
