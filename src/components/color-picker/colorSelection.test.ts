import { describe, expect, it } from 'vitest'
import { toColorSelectionPayload } from './colorSelection'

describe('toColorSelectionPayload', () => {
  it('retains the property key for a project color variable', () => {
    expect(
      toColorSelectionPayload({
        hex: '#9eea20',
        value: '0x9eea20',
        propertyKey: 'accentColor',
      }),
    ).toEqual({ color: '#9eea20', propertyKey: 'accentColor' })
  })

  it.each(['#ffffff', 'transparent'])(
    'uses an empty property key for static color %s',
    (color) => {
      expect(toColorSelectionPayload({ hex: color, value: color })).toEqual({
        color,
        propertyKey: '',
      })
    },
  )

  it('normalizes missing input to a safe static color', () => {
    expect(toColorSelectionPayload(undefined)).toEqual({
      color: '#ffffff',
      propertyKey: '',
    })
  })
})
