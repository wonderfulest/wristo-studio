// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hasSlugConflict: vi.fn(),
  generateSvgIconFontSlug: vi.fn(),
  messageError: vi.fn(),
}))

vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('element-plus', () => ({ ElMessage: { error: mocks.messageError } }))
vi.mock('../iconFontSlugAvailability', () => ({
  hasIconFontSlugConflict: mocks.hasSlugConflict,
}))
vi.mock('../iconFontName', () => ({
  generateSvgIconFontSlug: mocks.generateSvgIconFontSlug,
}))

import CreateGlyphDialog from './CreateGlyphDialog.vue'

const stubs = {
  ElDialog: {
    props: ['modelValue'],
    template: '<div v-if="modelValue" class="dialog"><slot/><slot name="footer"/></div>',
  },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue', 'blur'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  ElButton: {
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot/></button>',
  },
  ElSelect: { template: '<div><slot/></div>' },
  ElOption: true,
  ElIcon: { template: '<span><slot/></span>' },
  Refresh: true,
}

const mountWeatherDialog = async () => {
  const wrapper = mount(CreateGlyphDialog, {
    props: {
      modelValue: false,
      form: { fontType: 'weather_font' as const },
    },
    global: { stubs },
  })
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
  return wrapper
}

const mountOrdinaryDialog = async () => {
  const wrapper = mount(CreateGlyphDialog, {
    props: {
      modelValue: false,
      form: { fontType: 'icon_font' as const },
    },
    global: { stubs },
  })
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
  return wrapper
}

describe('CreateGlyphDialog weather font automatic naming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retries automatically when the generated slug already exists', async () => {
    mocks.generateSvgIconFontSlug
      .mockReturnValueOnce('weather-font-000001')
      .mockReturnValueOnce('weather-font-000002')
    mocks.hasSlugConflict.mockResolvedValueOnce(true).mockResolvedValueOnce(false)

    const wrapper = await mountWeatherDialog()

    expect(mocks.hasSlugConflict).toHaveBeenNthCalledWith(1, 'weather-font-000001')
    expect(mocks.hasSlugConflict).toHaveBeenNthCalledWith(2, 'weather-font-000002')
    expect(wrapper.get('.naming-preview-value').text()).toBe('weather-font-000002')
  })

  it('regenerates a conflicted slug at confirmation and creates without manual input', async () => {
    mocks.generateSvgIconFontSlug
      .mockReturnValueOnce('weather-font-000001')
      .mockReturnValueOnce('weather-font-000002')
    mocks.hasSlugConflict
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)

    const wrapper = await mountWeatherDialog()
    await wrapper.findAll('button').at(-1)!.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('confirm')).toEqual([[
      expect.objectContaining({
        glyphCode: 'weather-font-000002',
        fontType: 'weather_font',
      }),
    ]])
  })

  it('automatically names an ordinary icon font without manual input', async () => {
    mocks.generateSvgIconFontSlug.mockReturnValueOnce('icon-font-20260822-a3f2')
    mocks.hasSlugConflict.mockResolvedValueOnce(false).mockResolvedValueOnce(false)

    const wrapper = await mountOrdinaryDialog()
    expect(mocks.generateSvgIconFontSlug).toHaveBeenCalledWith('icon_font')
    expect(wrapper.get('.naming-preview-value').text()).toBe('icon-font-20260822-a3f2')

    await wrapper.findAll('button').at(-1)!.trigger('click')
    await flushPromises()
    expect(wrapper.emitted('confirm')).toEqual([[
      expect.objectContaining({ glyphCode: 'icon-font-20260822-a3f2', fontType: 'icon_font' }),
    ]])
  })
})
