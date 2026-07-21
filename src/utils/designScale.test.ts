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
