import { describe, expect, it } from 'vitest'
import {
  getHandGeometry,
  getHandPivot,
  getRotatedHandCenter,
  handScalePercentToSlider,
  handScaleSliderToPercent,
  moveHandCenterKeepingPivot,
  moveHandPivotKeepingCenter,
} from './hand.geometry'

describe('hand geometry', () => {
  it('moves the hand material while keeping the rotation pivot fixed', () => {
    expect(moveHandCenterKeepingPivot(
      { centerX: 220, centerY: 200, pivotOffsetX: 7, pivotOffsetY: 27 },
      { x: 225, y: 198 },
    )).toEqual({
      centerX: 225,
      centerY: 198,
      pivotOffsetX: 2,
      pivotOffsetY: 29,
      pivotX: 227,
      pivotY: 227,
    })
  })

  it('moves the rotation pivot while keeping the hand material fixed', () => {
    expect(moveHandPivotKeepingCenter(
      { centerX: 220, centerY: 200 },
      { x: 230, y: 240 },
    )).toEqual({
      centerX: 220,
      centerY: 200,
      pivotOffsetX: 10,
      pivotOffsetY: 40,
      pivotX: 230,
      pivotY: 240,
    })
  })

  it('resolves the persisted rotation pivot from center and offset', () => {
    expect(getHandPivot({ centerX: 210, centerY: 215, pivotOffsetX: 17, pivotOffsetY: 12 }))
      .toEqual({ x: 227, y: 227 })
  })

  it('keeps legacy hands centered with the existing automatic scale', () => {
    expect(getHandGeometry({ left: 227, top: 227 }, 454, 20, 100)).toEqual({
      centerX: 227,
      centerY: 227,
      pivotOffsetX: 0,
      pivotOffsetY: 0,
      pivotX: 227,
      pivotY: 227,
      scalePercent: 100,
      imageScale: 4.54,
    })
  })

  it('normalizes invalid values and applies a positive scale percentage', () => {
    expect(getHandGeometry({
      left: 120,
      top: 140,
      centerX: Number.NaN,
      centerY: 180,
      pivotOffsetX: 12,
      pivotOffsetY: -30,
      scalePercent: 50,
    }, 400, 40, 200)).toEqual({
      centerX: 120,
      centerY: 180,
      pivotOffsetX: 12,
      pivotOffsetY: -30,
      pivotX: 132,
      pivotY: 150,
      scalePercent: 50,
      imageScale: 1,
    })
  })

  it('rotates the image center around the configured pivot', () => {
    expect(getRotatedHandCenter({
      centerX: 200,
      centerY: 100,
      pivotOffsetX: 20,
      pivotOffsetY: 0,
    }, 90)).toEqual({ left: 220, top: 80 })
  })

  it('places the common 100% scale at the middle of the slider', () => {
    expect(handScalePercentToSlider(10)).toBe(0)
    expect(handScalePercentToSlider(100)).toBe(50)
    expect(handScalePercentToSlider(500)).toBe(100)
    expect(handScaleSliderToPercent(0)).toBe(10)
    expect(handScaleSliderToPercent(50)).toBe(100)
    expect(handScaleSliderToPercent(100)).toBe(500)
  })

  it('uses finer scale changes on the lower half and clamps both directions', () => {
    expect(handScaleSliderToPercent(25)).toBe(55)
    expect(handScaleSliderToPercent(75)).toBe(300)
    expect(handScaleSliderToPercent(-20)).toBe(10)
    expect(handScaleSliderToPercent(120)).toBe(500)
    expect(handScalePercentToSlider(5)).toBe(0)
    expect(handScalePercentToSlider(800)).toBe(100)
  })
})
