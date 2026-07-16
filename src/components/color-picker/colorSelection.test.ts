import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { toColorSelectionPayload } from './colorSelection'

describe('toColorSelectionPayload', () => {
  it('retains the property key for a project color variable', () => {
    expect(
      toColorSelectionPayload({
        hex: '#9eea20',
        value: '0x9eea20',
        propertyKey: 'accentColor'
      })
    ).toEqual({ color: '#9eea20', propertyKey: 'accentColor' })
  })

  it.each(['#ffffff', 'transparent'])('uses an empty property key for static color %s', (color) => {
    expect(toColorSelectionPayload({ hex: color, value: color })).toEqual({
      color,
      propertyKey: ''
    })
  })

  it('normalizes missing input to a safe static color', () => {
    expect(toColorSelectionPayload(undefined)).toEqual({
      color: '#ffffff',
      propertyKey: ''
    })
  })
})

describe('ColorPicker RGB565 extension contract', () => {
  const source = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

  it('keeps quick colors as default and exposes RGB565 as an extension', () => {
    expect(source).toContain("const pickerView = ref('quick')")
    expect(source).toContain("t('colorPicker.moreColors')")
    expect(source).toContain('<Rgb565ColorSpectrum')
    expect(source).toContain("pickerView.value = 'quick'")
  })

  it('routes RGB565 changes through solid and gradient paths', () => {
    expect(source).toContain('handleRgb565Change')
    expect(source).toContain('updateGradientStop(activeGradientStop.value, color)')
    expect(source).toContain('selectColor({ hex: color, value: color })')
  })
})

describe('ColorPicker canvas colors contract', () => {
  const source = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

  it('exposes canvas colors only when the caller provides them', () => {
    expect(source).toContain('canvasColors:')
    expect(source).toContain('v-if="canvasColors.length > 0"')
  })

  it('renders canvas colors through the existing static color path', () => {
    expect(source).toContain("t('colorPicker.canvasColors')")
    expect(source).toContain('class="canvas-colors-grid"')
    expect(source).toContain('selectColor({ hex: color, value: color })')
  })
})
