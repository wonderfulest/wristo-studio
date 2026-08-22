// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { resolveCanvasSelectionIds } from './canvasManager'

describe('canvas selection ids', () => {
  it('keeps the owning hand selected when the calibration crosshair becomes active', () => {
    expect(resolveCanvasSelectionIds([
      { eleType: 'handCalibrationPivot', handId: 'rotating-hand-1' },
    ])).toEqual(['rotating-hand-1'])
  })
})
