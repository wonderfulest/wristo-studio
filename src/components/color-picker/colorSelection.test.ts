// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { toColorSelectionPayload } from './colorSelection'

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
const propertiesState = vi.hoisted(() => ({
  properties: {} as Record<string, { type: string; title: string; value: string }>,
}))
const resolvedColorValues = vi.hoisted(() => ({
  values: {} as Record<string, string>,
}))

vi.mock('@/stores/properties', () => ({
  usePropertiesStore: () => ({
    properties: propertiesState.properties,
    setLastSelectedColor: vi.fn(),
  }),
}))
vi.mock('@/engine/services/colorPropertyValueService', () => ({
  getColorPropertyValue: (key: string) => resolvedColorValues.values[key],
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

  it.each(['#ffffff', 'transparent'])('clears the property key for static color %s', (color) => {
    expect(toColorSelectionPayload({ hex: color, value: color })).toEqual({
      color,
      propertyKey: null
    })
  })

  it('normalizes missing input to a safe static color', () => {
    expect(toColorSelectionPayload(undefined)).toEqual({
      color: '#ffffff',
      propertyKey: null
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

  it('builds variable choices with the shared current-theme resolver', () => {
    expect(source).toContain('getColorPropertyValue')
    expect(source).toContain('buildColorPropertyChoices')
    expect(source).not.toContain("hex: `#${prop.value.replace('0x', '')}`")
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
    expect(wrapper.emitted('property-change')).toEqual([[{ color: '#ABCDEF', propertyKey: null }]])
    wrapper.unmount()
  })
})

describe('ColorPicker current theme variable choices', () => {
  it('displays and selects the resolved current-theme color', async () => {
    propertiesState.properties = {
      accentColor: { type: 'color', title: 'Accent Color', value: '0xFFFFFF' },
    }
    resolvedColorValues.values = { accentColor: '0x112233' }
    const wrapper = mount(ColorPicker)

    await wrapper.find('.color-input').trigger('click')
    const choice = wrapper.find('.color-variable-item')

    expect(choice.find('.color-hex').text()).toBe('#112233')
    await choice.trigger('click')
    expect(wrapper.emitted('property-change')).toEqual([[
      { color: '#112233', propertyKey: 'accentColor' },
    ]])
    wrapper.unmount()
  })
})

describe('ColorPicker bound property display', () => {
  it('shows the property title and key for a valid color binding', () => {
    propertiesState.properties = {
      accentColor: { type: 'color', title: 'Accent Color', value: '0xFFAA00' },
    }

    const wrapper = mount(ColorPicker, {
      props: { modelValue: '#FFAA00', propertyKey: 'accentColor' },
    })

    expect(wrapper.find('input').element.value).toBe('Accent Color · accentColor')
    expect(wrapper.find('input').attributes('title')).toBe('#FFAA00')
    wrapper.unmount()
  })

  it('keeps the static value when no binding exists', () => {
    propertiesState.properties = {}
    const wrapper = mount(ColorPicker, { props: { modelValue: '#123456' } })

    expect(wrapper.find('input').element.value).toBe('#123456')
    wrapper.unmount()
  })

  it.each([
    ['missingColor', {}],
    ['textProperty', { textProperty: { type: 'text', title: 'Text', value: 'hello' } }],
  ])('falls back when binding %s is invalid', (propertyKey, properties) => {
    propertiesState.properties = properties
    const wrapper = mount(ColorPicker, {
      props: { modelValue: '#123456', propertyKey },
    })

    expect(wrapper.find('input').element.value).toBe('#123456')
    wrapper.unmount()
  })

  it('keeps the gradient summary instead of the property label', () => {
    propertiesState.properties = {
      accentColor: { type: 'color', title: 'Accent Color', value: '0xFFAA00' },
    }
    const wrapper = mount(ColorPicker, {
      props: {
        modelValue: '#FFAA00',
        propertyKey: 'accentColor',
        enableGradient: true,
        gradientEnabled: true,
        gradientStartColor: '#000000',
        gradientEndColor: '#FFFFFF',
      },
    })

    expect(wrapper.find('input').element.value).toBe('#000000 - #FFFFFF')
    wrapper.unmount()
  })
})

describe('ColorPicker explicit binding callers', () => {
  it.each([
    'src/elements/decoration/background/background.panel.vue',
    'src/elements/goal/goalArc/goalArc.panel.vue',
    'src/elements/indicators/alarms/alarms.panel.vue',
    'src/elements/indicators/bluetooth/bluetooth.panel.vue',
    'src/elements/indicators/disturb/disturb.panel.vue',
    'src/elements/indicators/notification/notification.panel.vue',
    'src/elements/texts/angledText/angledText.panel.vue',
    'src/elements/texts/radialText/radialText.panel.vue',
    'src/elements/texts/scrollableText/scrollableText.panel.vue',
    'src/elements/texts/text/text.panel.vue',
    'src/elements/time/date/date.panel.vue',
    'src/elements/time/time/time.panel.vue',
    'src/elements/weather/weather/weather.panel.vue',
  ])('%s passes its explicit binding to ColorPicker', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8')
    expect(source).toContain(':property-key=')
  })
})
