import { describe, expect, it } from 'vitest'
import type { RuntimeDesignConfig } from '@/types/app/config'
import {
  normalizeConfigToStandardSize,
  scaleElementConfig,
  scaleFabricCanvasForDesignSize,
  STANDARD_DESIGN_SIZE,
} from './designScale'

describe('design font-size round trip', () => {
  it('scales horizontal layout group anchors, gaps, and vertical offsets', () => {
    const config = {
      elements: [],
      layoutGroups: [{
        id: 'row-1', name: 'Row', direction: 'horizontal', left: 195, top: 100, originX: 'left',
        members: [
          { elementId: 'data-1', gapBefore: 0, offsetY: 0 },
          { elementId: 'unit-1', gapBefore: 10, offsetY: 5 },
        ],
      }],
    } as unknown as RuntimeDesignConfig

    const saved = normalizeConfigToStandardSize(config, { width: 390, height: 200 })

    expect(saved.layoutGroups?.[0]).toMatchObject({ left: 227, top: 227 })
    expect(saved.layoutGroups?.[0].members[1]).toEqual({
      elementId: 'unit-1',
      gapBefore: 11.641,
      offsetY: 11.35,
    })
  })

  it('keeps a data font size of 30 after save normalization and reload scaling', () => {
    const deviceSize = { width: 506, height: 506 }
    const config = {
      elements: [
        {
          id: 'data-1',
          eleType: 'data',
          left: 253,
          top: 253,
          originX: 'center',
          originY: 'center',
          fontSize: 30,
          fontFamily: 'roboto-condensed-regular',
          fill: '#ffffff',
          dataProperty: 'data_1',
          metricSymbol: ':DATA_TYPE_STEPS',
        },
      ],
    } as RuntimeDesignConfig

    const saved = normalizeConfigToStandardSize(config, deviceSize)
    expect(saved.elements[0].fontSize).toBe(24)

    const restored = scaleElementConfig(saved.elements[0], {
      width: STANDARD_DESIGN_SIZE,
      height: STANDARD_DESIGN_SIZE,
    }, deviceSize)

    expect(restored.fontSize).toBe(30)
  })
})

describe('analog hand design-size scaling', () => {
  it('scales rotating hand center and pivot offsets like time hands', () => {
    const scaled = scaleElementConfig({
      id: 'rotating-hand',
      eleType: 'rotatingHand',
      centerX: 100,
      centerY: 120,
      pivotOffsetX: 5,
      pivotOffsetY: 10,
      scalePercent: 60,
    } as any, { width: 390, height: 390 }, { width: 454, height: 454 }) as any

    expect(scaled).toMatchObject({
      centerX: 116,
      centerY: 140,
      pivotOffsetX: 6,
      pivotOffsetY: 12,
      scalePercent: 60,
    })
  })

  it('keeps the hand pivot and relative length stable when reopening a smaller design at 454', () => {
    const scaled = scaleElementConfig({
      id: 'minute-hand',
      eleType: 'minuteHand',
      centerX: 195,
      centerY: 190,
      pivotOffsetX: 10,
      pivotOffsetY: 5,
      scalePercent: 72,
    } as any, {
      width: 390,
      height: 390,
    }, {
      width: STANDARD_DESIGN_SIZE,
      height: STANDARD_DESIGN_SIZE,
    }) as any

    expect(scaled.centerX).toBe(227)
    expect(scaled.centerY).toBe(221)
    expect(scaled.pivotOffsetX).toBe(12)
    expect(scaled.pivotOffsetY).toBe(6)
    expect(scaled.scalePercent).toBe(72)
  })

  it('recalculates the rotated hand position and display scale when the live canvas size changes', () => {
    const hand: any = {
      eleType: 'minuteHand',
      centerX: 195,
      centerY: 190,
      pivotOffsetX: 10,
      pivotOffsetY: 5,
      left: 190,
      top: 200,
      angle: 90,
      scaleX: 0.8,
      scaleY: 0.8,
      set(keyOrPatch: string | Record<string, unknown>, value?: unknown) {
        if (typeof keyOrPatch === 'string') this[keyOrPatch] = value
        else Object.assign(this, keyOrPatch)
      },
      setCoords() {},
    }
    const canvas: any = {
      getObjects: () => [hand],
      requestRenderAll() {},
    }

    scaleFabricCanvasForDesignSize(canvas, { width: 390, height: 390 }, { width: 454, height: 454 })

    expect(hand).toMatchObject({
      centerX: 227,
      centerY: 221,
      pivotOffsetX: 12,
      pivotOffsetY: 6,
      left: 245,
      top: 215,
    })
    expect(hand.scaleX).toBeCloseTo(0.93128, 5)
    expect(hand.scaleY).toBeCloseTo(0.93128, 5)
  })
})
