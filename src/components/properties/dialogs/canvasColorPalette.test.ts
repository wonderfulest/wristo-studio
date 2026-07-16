import { describe, expect, it } from 'vitest'
import { collectCanvasColors } from './canvasColorPalette'

describe('collectCanvasColors', () => {
  it('recursively collects and normalizes colors from element configs', () => {
    const colors = collectCanvasColors([
      {
        config: {
          fill: '#123456',
          stroke: '0x123456',
          nested: [{ colors: ['00FF00'] }]
        }
      }
    ])

    expect(colors).toEqual(['#103452', '#00FF00'])
  })

  it('ignores values that are not six-digit hex colors', () => {
    const colors = collectCanvasColors([
      {
        config: {
          transparent: 'transparent',
          sentinel: -1,
          binding: 'prop.color_1',
          shorthand: '#123',
          empty: '',
          missing: null
        }
      }
    ])

    expect(colors).toEqual([])
  })

  it('deduplicates normalized RGB565 colors while preserving first-seen order', () => {
    const colors = collectCanvasColors([{ config: { fill: '#123456' } }, { config: { stroke: '0x103452', accent: '#FF0000' } }])

    expect(colors).toEqual(['#103452', '#FF0000'])
  })
})
