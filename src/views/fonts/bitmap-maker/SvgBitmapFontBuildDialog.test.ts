// @vitest-environment jsdom

import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import { WEATHER_FONT_SLOTS } from '@/features/bitmap-font-maker/weatherSourceSet'

const { buildWorker, buildSvgIconWorker, confirmOverwrite, publishWeather, publishSvgIcon, successMessage } = vi.hoisted(() => ({
  buildWorker: vi.fn(),
  buildSvgIconWorker: vi.fn(),
  confirmOverwrite: vi.fn(),
  publishWeather: vi.fn(),
  publishSvgIcon: vi.fn(),
  successMessage: vi.fn()
}))

vi.mock('@/features/bitmap-font-maker/weatherWorkerClient', () => ({
  WeatherBitmapFontWorkerClient: vi.fn(() => ({ build: buildWorker, dispose: vi.fn() }))
}))
vi.mock('@/features/bitmap-font-maker/svgIconWorkerClient', () => ({
  SvgIconBitmapFontWorkerClient: vi.fn(() => ({ build: buildSvgIconWorker, dispose: vi.fn() }))
}))
vi.mock('@/api/wristo/bitmapFontBuild', () => ({
  publishWeatherBitmapFontBuild: publishWeather,
  publishSvgIconBitmapFontBuild: publishSvgIcon,
  isBitmapFontSlugConflict: (error: { code?: unknown }) => error?.code === 411
}))
vi.mock('element-plus', () => ({ ElMessage: { success: successMessage }, ElMessageBox: { confirm: confirmOverwrite } }))
vi.mock('jszip', () => ({ default: { loadAsync: vi.fn().mockResolvedValue({ file: () => null }) } }))

import WeatherBitmapBuildDialog from './SvgBitmapFontBuildDialog.vue'
import dialogSource from './SvgBitmapFontBuildDialog.vue?raw'

const stubs = {
  'el-dialog': { template: '<div><slot/><slot name="footer"/></div>' },
  'el-button': { props: ['disabled'], template: '<button :disabled="disabled"><slot/></button>' },
  'el-slider': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input data-test="content-scale-slider" type="range" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
  },
  'el-progress': { template: '<div />' },
  'el-checkbox': { props: ['modelValue'], emits: ['update:modelValue'], template: '<input data-test="rights-checkbox" type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />' },
  'el-select': { template: '<select><slot/></select>' },
  'el-option': { template: '<option />' }
}

describe('WeatherBitmapBuildDialog', () => {
  beforeEach(() => {
    buildWorker.mockReset()
    buildSvgIconWorker.mockReset()
    confirmOverwrite.mockReset()
    publishWeather.mockReset()
    publishSvgIcon.mockReset()
    successMessage.mockReset()
  })

  it('shows source completeness and locks generation until all twelve slots are filled', () => {
    const empty = mount(WeatherBitmapBuildDialog, {
      props: { modelValue: true, glyphId: 7, glyphCode: 'my-weather', relations: [] },
      global: { stubs, plugins: [createPinia()] }
    })
    expect(empty.get('[data-test="weather-completeness"]').text()).toContain('0 / 12')
    expect(empty.get('[data-test="weather-build-button"]').attributes('disabled')).toBeDefined()

    const completeRelations = WEATHER_FONT_SLOTS.map((slot, index) => ({
      id: index + 1,
      glyphId: 7,
      assetId: index + 10,
      version: 1,
      isActive: 1,
      icon: { id: index + 20, iconUnicode: slot.iconUnicode, symbolCode: slot.symbolCode, category: 'weather', label: slot.label, isActive: 1 },
      asset: { id: index + 10, iconId: index + 20, sourceType: 'custom', format: 'svg', svgContent: '<svg></svg>' }
    }))
    const complete = mount(WeatherBitmapBuildDialog, {
      props: { modelValue: true, glyphId: 7, glyphCode: 'my-weather', relations: completeRelations },
      global: { stubs, plugins: [createPinia()] }
    })
    expect(complete.get('[data-test="weather-completeness"]').text()).toContain('12 / 12')
    expect(complete.get('[data-test="weather-build-button"]').attributes('disabled')).toBeUndefined()
  })

  it('keeps short source lists compact and makes long source lists independently scrollable', () => {
    const weather = mount(WeatherBitmapBuildDialog, {
      props: { modelValue: true, glyphId: 7, glyphCode: 'my-weather', relations: [] },
      global: { stubs, plugins: [createPinia()] }
    })
    expect(weather.get('.slot-grid').classes()).not.toContain('scrollable')

    const ordinarySlots = Array.from({ length: 19 }, (_, index) => ({
      iconUnicode: (0x20 + index).toString(16).padStart(4, '0'),
      codepoint: 0x20 + index,
      symbolCode: `icon_${index}`,
      label: `Icon ${index}`,
    }))
    const ordinary = mount(WeatherBitmapBuildDialog, {
      props: {
        modelValue: true,
        glyphId: 8,
        glyphCode: 'icon-font-20260822-a3f2',
        fontType: 'icon_font',
        slots: ordinarySlots,
        relations: [],
      },
      global: { stubs, plugins: [createPinia()] },
    })

    expect(ordinary.get('.slot-grid').classes()).toContain('scrollable')
  })

  it('updates the SVG source previews while the content scale slider moves', async () => {
    const wrapper = mountCompleteDialog()

    expect(wrapper.get('.slot-grid').attributes('style')).toContain('--glyph-preview-scale: 0.88')

    await wrapper.get('[data-test="content-scale-slider"]').setValue(50)

    expect(wrapper.get('.slot-grid').attributes('style')).toContain('--glyph-preview-scale: 0.5')
  })

  it('uses the full black preview frame as the 100 percent scale baseline', () => {
    expect(dialogSource).toMatch(/\.slot-preview img\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*contain/s)
  })

  it('vertically centers the redistribution checkbox and its label', () => {
    expect(dialogSource).toMatch(/\.rights-row\s*\{[^}]*align-items:\s*center/s)
  })

  it('asks before retrying a 411 conflict and sends overwrite only after confirmation', async () => {
    const wrapper = mountCompleteDialog()
    await buildArtifact(wrapper)
    await wrapper.get('[data-test="rights-checkbox"]').setValue(true)
    publishWeather.mockRejectedValueOnce({ code: 411 }).mockResolvedValueOnce({ code: 0, data: { id: 77, slug: 'my-weather' } })
    confirmOverwrite.mockResolvedValue('confirm')

    await wrapper.get('[data-test="weather-publish-button"]').trigger('click')
    await flushPromises()

    expect(confirmOverwrite).toHaveBeenCalledTimes(1)
    expect(confirmOverwrite.mock.calls[0][2]).toMatchObject({ confirmButtonText: expect.any(String), cancelButtonText: expect.any(String), type: 'warning' })
    expect(publishWeather).toHaveBeenCalledTimes(2)
    expect(publishWeather.mock.calls[0][0].overwrite).toBeUndefined()
    expect(publishWeather.mock.calls[1][0].overwrite).toBe(true)
    expect(successMessage).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('published')).toHaveLength(1)
  })

  it('abandons the overwrite retry without showing a publish error', async () => {
    const wrapper = mountCompleteDialog()
    await buildArtifact(wrapper)
    await wrapper.get('[data-test="rights-checkbox"]').setValue(true)
    publishWeather.mockRejectedValueOnce({ code: 411 })
    confirmOverwrite.mockRejectedValue('cancel')

    await wrapper.get('[data-test="weather-publish-button"]').trigger('click')
    await flushPromises()

    expect(publishWeather).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.error-message').exists()).toBe(false)
    expect(wrapper.emitted('published')).toBeUndefined()
    expect(wrapper.get('[data-test="weather-publish-button"]').attributes('disabled')).toBeUndefined()
  })

  it('builds and publishes an ordinary icon font only when every system slot has an SVG', async () => {
    const slots = [
      { iconUnicode: '0030', codepoint: 0x30, symbolCode: 'heart_rate', label: 'Heart rate' },
      { iconUnicode: '0031', codepoint: 0x31, symbolCode: 'steps', label: 'Steps' },
    ]
    const relations = slots.map((slot, index) => ({
      id: index + 1,
      glyphId: 8,
      assetId: index + 10,
      version: 1,
      isActive: 1,
      icon: { id: index + 20, iconUnicode: slot.iconUnicode, symbolCode: slot.symbolCode, category: 'field', label: slot.label, isActive: 1 },
      asset: { id: index + 10, iconId: index + 20, sourceType: 'custom', format: 'svg', svgContent: '<svg></svg>' },
    }))
    const wrapper = mount(WeatherBitmapBuildDialog, {
      props: {
        modelValue: true,
        glyphId: 8,
        glyphCode: 'icon-font-20260822-a3f2',
        fontType: 'icon_font',
        slots,
        relations,
      },
      global: { stubs, plugins: [createPinia()] },
    })
    buildSvgIconWorker.mockResolvedValue({
      requestId: 'ordinary-build',
      cancel: vi.fn(),
      result: Promise.resolve({ zip: new ArrayBuffer(0), manifest: { type: 'icon_font' } }),
    })
    publishSvgIcon.mockResolvedValue({ code: 0, data: { id: 78 } })

    expect(wrapper.get('[data-test="weather-completeness"]').text()).toContain('2 / 2')
    await wrapper.get('[data-test="weather-build-button"]').trigger('click')
    await flushPromises()
    expect(buildSvgIconWorker).toHaveBeenCalledWith(expect.objectContaining({ type: 'icon_font', slots }), expect.any(Function))
    await wrapper.get('[data-test="rights-checkbox"]').setValue(true)
    await wrapper.get('[data-test="weather-publish-button"]').trigger('click')
    await flushPromises()
    expect(publishSvgIcon).toHaveBeenCalledWith(expect.objectContaining({ glyphId: 8, metadata: expect.objectContaining({ type: 'icon_font' }) }))
  })

  it('reports SVG decoding failures from generation without a separate preflight stage', async () => {
    const slots = [
      { iconUnicode: '0030', codepoint: 0x30, symbolCode: 'heart_rate', label: 'Heart rate' },
      { iconUnicode: '0031', codepoint: 0x31, symbolCode: 'steps', label: 'Steps' },
    ]
    const relations = slots.map((slot, index) => ({
      id: index + 1,
      glyphId: 8,
      assetId: index + 10,
      version: 1,
      isActive: 1,
      icon: { id: index + 20, iconUnicode: slot.iconUnicode, symbolCode: slot.symbolCode, category: 'field', label: slot.label, isActive: 1 },
      asset: { id: index + 10, iconId: index + 20, sourceType: 'custom', format: 'svg', svgContent: '<svg></svg>' },
    }))
    buildSvgIconWorker.mockResolvedValue({
      requestId: 'ordinary-build',
      cancel: vi.fn(),
      result: Promise.reject(new Error('SVG_ICON_DECODE_FAILED')),
    })
    const wrapper = mount(WeatherBitmapBuildDialog, {
      props: {
        modelValue: true,
        glyphId: 8,
        glyphCode: 'icon-font-20260822-a3f2',
        fontType: 'icon_font',
        slots,
        relations,
      },
      global: { stubs, plugins: [createPinia()] },
    })

    await wrapper.get('[data-test="weather-build-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="svg-preflight-status"]').exists()).toBe(false)
    expect(wrapper.find('.build-progress').exists()).toBe(false)
    expect(wrapper.get('.error-message').text()).toContain('SVG_ICON_DECODE_FAILED')
  })

  it('starts generation immediately without a separate SVG preflight status', async () => {
    const slots = [{ iconUnicode: '0030', codepoint: 0x30, symbolCode: 'heart_rate', label: 'Heart rate' }]
    const relations = [{
      id: 1,
      glyphId: 8,
      assetId: 10,
      version: 1,
      isActive: 1,
      icon: { id: 20, iconUnicode: '0030', symbolCode: 'heart_rate', category: 'field', label: 'Heart rate', isActive: 1 },
      asset: { id: 10, iconId: 20, sourceType: 'custom', format: 'svg', svgContent: '<svg></svg>' },
    }]
    let finishBuild!: (artifact: unknown) => void
    buildSvgIconWorker.mockResolvedValue({
      requestId: 'ordinary-build',
      cancel: vi.fn(),
      result: new Promise((resolve) => { finishBuild = resolve }),
    })
    const wrapper = mount(WeatherBitmapBuildDialog, {
      props: {
        modelValue: true,
        glyphId: 8,
        glyphCode: 'icon-font-20260822-a3f2',
        fontType: 'icon_font',
        slots,
        relations,
      },
      global: { stubs, plugins: [createPinia()] },
    })

    await wrapper.get('[data-test="weather-build-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="svg-preflight-status"]').exists()).toBe(false)
    expect(wrapper.find('.build-progress').exists()).toBe(true)

    finishBuild({ zip: new ArrayBuffer(0), manifest: { type: 'icon_font' } })
    await flushPromises()
  })

  it('restores the current font recipe before rebuilding from quick edit', async () => {
    const wrapper = mount(WeatherBitmapBuildDialog, {
      props: {
        modelValue: true,
        glyphId: 7,
        glyphCode: 'my-weather',
        relations: completeRelations() as any,
        initialRecipe: { schemaVersion: 1, rendererVersion: '1', contentScale: 0.65, antialias: true },
      },
      global: { stubs, plugins: [createPinia()] },
    })
    buildWorker.mockResolvedValue({
      requestId: 'edit-build',
      cancel: vi.fn(),
      result: Promise.resolve({ zip: new ArrayBuffer(0), manifest: { type: 'weather_font' } }),
    })

    await wrapper.get('[data-test="weather-build-button"]').trigger('click')
    await flushPromises()

    expect(buildWorker.mock.calls[0][0].recipe).toMatchObject({ contentScale: 0.65 })
  })

  it('directly overwrites the current SVG bitmap font without a conflict round trip', async () => {
    const wrapper = mount(WeatherBitmapBuildDialog, {
      props: {
        modelValue: true,
        glyphId: 7,
        glyphCode: 'my-weather',
        relations: completeRelations() as any,
        overwrite: true,
      },
      global: { stubs, plugins: [createPinia()] },
    })
    await buildArtifact(wrapper)
    await wrapper.get('[data-test="rights-checkbox"]').setValue(true)
    publishWeather.mockResolvedValueOnce({ code: 0, data: { id: 77, slug: 'my-weather' } })

    await wrapper.get('[data-test="weather-publish-button"]').trigger('click')
    await flushPromises()

    expect(publishWeather).toHaveBeenCalledTimes(1)
    expect(publishWeather).toHaveBeenCalledWith(expect.objectContaining({ overwrite: true }))
    expect(confirmOverwrite).not.toHaveBeenCalled()
  })
})

function completeRelations() {
  return WEATHER_FONT_SLOTS.map((slot, index) => ({
    id: index + 1,
    glyphId: 7,
    assetId: index + 10,
    version: 1,
    isActive: 1,
    icon: { id: index + 20, iconUnicode: slot.iconUnicode, symbolCode: slot.symbolCode, category: 'weather', label: slot.label, isActive: 1 },
    asset: { id: index + 10, iconId: index + 20, sourceType: 'custom', format: 'svg', svgContent: '<svg viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>' }
  }))
}

function mountCompleteDialog() {
  return mount(WeatherBitmapBuildDialog, {
    props: { modelValue: true, glyphId: 7, glyphCode: 'my-weather', relations: completeRelations() as any },
    global: { stubs, plugins: [createPinia()] }
  })
}

async function buildArtifact(wrapper: ReturnType<typeof mount>) {
  buildWorker.mockResolvedValue({
    requestId: 'test-build',
    cancel: vi.fn(),
    result: Promise.resolve({
      zip: new ArrayBuffer(0),
      manifest: { schemaVersion: 1, slug: 'my-weather', type: 'weather_font', language: 'en', source: { files: [] }, sizes: [], charset: { profile: 'wristo-weather-v1', codepoints: [] }, recipeSha256: 'a', packageContentSha256: 'b' }
    })
  })
  await wrapper.get('[data-test="weather-build-button"]').trigger('click')
  await flushPromises()
}
