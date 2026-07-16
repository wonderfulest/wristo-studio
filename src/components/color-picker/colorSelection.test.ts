// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { toColorSelectionPayload } from './colorSelection'

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/stores/properties', () => ({
  usePropertiesStore: () => ({ properties: {}, setLastSelectedColor: vi.fn() })
}))

import ColorPicker from './index.vue'

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
  const source = readFileSync(resolve(process.cwd(), 'src/components/color-picker/index.vue'), 'utf8')

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
  it('does not render canvas colors by default', async () => {
    const wrapper = mount(ColorPicker)

    await wrapper.find('.color-input').trigger('click')

    expect(wrapper.find('.canvas-colors').exists()).toBe(false)
    wrapper.unmount()
  })

  it('renders one dedicated button for each provided canvas color', async () => {
    const canvasColors = ['#123456', '#ABCDEF']
    const wrapper = mount(ColorPicker, { props: { canvasColors } })

    await wrapper.find('.color-input').trigger('click')

    expect(wrapper.find('.canvas-colors-title').text()).toBe('colorPicker.canvasColors')
    expect(wrapper.find('.canvas-colors-grid').exists()).toBe(true)
    const buttons = wrapper.findAll('button.canvas-color-button')
    expect(buttons).toHaveLength(2)
    expect(buttons.map((button) => button.attributes('aria-label'))).toEqual(canvasColors)
    wrapper.unmount()
  })

  it('emits the selected canvas color through the static color events', async () => {
    const wrapper = mount(ColorPicker, { props: { canvasColors: ['#123456', '#ABCDEF'] } })
    await wrapper.find('.color-input').trigger('click')

    await wrapper.findAll('button.canvas-color-button')[1].trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['#ABCDEF']])
    expect(wrapper.emitted('change')).toEqual([['#ABCDEF']])
    expect(wrapper.emitted('property-change')).toEqual([[{ color: '#ABCDEF', propertyKey: '' }]])
    wrapper.unmount()
  })
})
