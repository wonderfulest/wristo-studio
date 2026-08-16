import { describe, expect, it } from 'vitest'
import type { RuntimeDesignConfig } from '@/types/app/config'
import { normalizeConfigToStandardSize, scaleElementConfig, STANDARD_DESIGN_SIZE } from './designScale'

describe('design font-size round trip', () => {
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
    expect(scaled.centerY).toBe(221.179)
    expect(scaled.pivotOffsetX).toBe(11.641)
    expect(scaled.pivotOffsetY).toBe(5.821)
    expect(scaled.scalePercent).toBe(72)
  })
})
