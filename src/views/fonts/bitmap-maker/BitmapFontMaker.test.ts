// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia } from 'pinia'

const mocks = vi.hoisted(() => ({
  parse: vi.fn(),
  check: vi.fn(),
  publish: vi.fn(),
  push: vi.fn(),
  build: vi.fn(),
  cancel: vi.fn(),
  dispose: vi.fn(),
  validate: vi.fn(),
}))

vi.mock('@/features/bitmap-font-maker/fontSource', () => ({
  parseFontSource: mocks.parse,
  checkRequiredGlyphs: mocks.check,
  FontSourceError: class FontSourceError extends Error { constructor(public code: string) { super(code) } },
}))
vi.mock('@/features/bitmap-font-maker/workerClient', () => ({
  BitmapFontWorkerClient: class {
    build = mocks.build
    dispose = mocks.dispose
  },
}))
vi.mock('@/api/wristo/bitmapFontBuild', () => ({
  publishBitmapFontBuild: mocks.publish,
  isBitmapFontSlugConflict: (error: any) => error?.response?.status === 409,
}))
vi.mock('./bitmapPackageRepack', () => ({
  repackageBitmapFontSlug: (zip: ArrayBuffer, current: any, slug: string) => Promise.resolve({ zip, manifest: { ...current, slug } }),
}))
vi.mock('./localPackageValidation', () => ({ validateLocalBitmapPackage: mocks.validate }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))

import BitmapFontMaker from './BitmapFontMaker.vue'

const parsed = {
  family: 'Precision Sans', glyphCount: 120, sourceWeight: 400, sourceItalic: false,
  unitsPerEm: 1000, ascender: 800, descender: -200, supportedCodepoints: new Set([48]),
  names: {}, font: {}, bytes: new Uint8Array([1, 2, 3]),
}
const manifest = { schemaVersion: 1, slug: 'precision-sans', type: 'number_font', language: 'en', sizes: Array.from({ length: 38 }, (_, index) => index + 1), charset: { profile: 'wristo-number-v1', codepoints: [48] }, source: { fileName: 'precision-sans.ttf', sha256: 'a' }, recipeSha256: 'b', packageContentSha256: 'c' }

function mountMaker() {
  return mount(BitmapFontMaker, {
    global: {
      plugins: [createPinia()],
      stubs: {
        ElIcon: true, UploadFilled: true,
      },
    },
  })
}

async function upload(wrapper: ReturnType<typeof mountMaker>, name = 'Precision Sans.ttf') {
  const file = new File([new Uint8Array([1, 2, 3])], name, { type: 'font/ttf' })
  const input = wrapper.get('[data-test="source-input"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await nextTick()
  return file
}

describe('BitmapFontMaker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.parse.mockResolvedValue(parsed)
    mocks.check.mockReturnValue({ profile: 'wristo-number-v1', missing: [] })
    mocks.build.mockReturnValue({
      requestId: 'build-1', cancel: mocks.cancel,
      result: Promise.resolve({ zip: new Uint8Array([80, 75]).buffer, manifest }),
    })
    mocks.publish.mockResolvedValue({ code: 0, data: { id: 7, slug: 'precision-sans' } })
    mocks.validate.mockResolvedValue(undefined)
    Object.defineProperty(File.prototype, 'arrayBuffer', {
      configurable: true,
      value: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
    })
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preview') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  })

  afterEach(() => {
    delete (URL as any).createObjectURL
    delete (URL as any).revokeObjectURL
  })

  it('keeps the local font in memory and reports required glyph failures for the selected type', async () => {
    mocks.check.mockReturnValue({ profile: 'wristo-number-v1', missing: [58, 176] })
    const wrapper = mountMaker()
    await upload(wrapper)
    expect(mocks.parse).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Missing required glyphs')
    expect(wrapper.text()).toContain('U+003A')
    expect(wrapper.get('[data-test="build-button"]').attributes('disabled')).toBeDefined()
  })

  it('validates outline-only recipes and makes raster changes stale but metadata changes do not', async () => {
    const wrapper = mountMaker()
    await upload(wrapper)
    const vm = wrapper.vm as any
    vm.recipe.outlineMode = 'outline-only'
    vm.recipe.outlineWidthEm = 0
    await nextTick()
    expect(vm.recipeValid).toBe(false)
    vm.recipe.outlineWidthEm = 0.12
    await nextTick()
    await vm.buildPackage()
    expect(vm.buildFresh).toBe(true)
    vm.metadata.fullName = 'A metadata rename'
    await nextTick()
    expect(vm.buildFresh).toBe(true)
    vm.recipe.italicAngle = -12
    await nextTick()
    expect(vm.buildFresh).toBe(false)
  })

  it('tracks progress, can cancel, and downloads the fresh ZIP with URL cleanup', async () => {
    let progress: ((value: any) => void) | undefined
    let resolveResult!: (value: any) => void
    mocks.build.mockImplementation((_request: any, callback: any) => {
      progress = callback
      return { requestId: 'build-2', cancel: mocks.cancel, result: new Promise(resolve => { resolveResult = resolve }) }
    })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const wrapper = mountMaker()
    await upload(wrapper)
    const vm = wrapper.vm as any
    const promise = vm.buildPackage()
    await vi.waitFor(() => expect(progress).toBeTypeOf('function'))
    progress?.({ completed: 12, size: 24, total: 38 })
    expect(vm.buildProgress.completed).toBe(12)
    vm.cancelBuild()
    expect(mocks.cancel).toHaveBeenCalled()
    resolveResult({ zip: new Uint8Array([80, 75]).buffer, manifest })
    await promise
    vm.downloadPackage()
    expect(click).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
    wrapper.unmount()
    expect(mocks.dispose).toHaveBeenCalled()
  })

  it('publishes exact fresh artifacts, preserves freshness on slug conflict, and retries without rasterizing', async () => {
    const wrapper = mountMaker()
    const source = await upload(wrapper)
    const vm = wrapper.vm as any
    await vm.buildPackage()
    mocks.publish.mockRejectedValueOnce({ response: { status: 409 } })
    await vm.publishPackage()
    expect(vm.buildFresh).toBe(true)
    expect(vm.slugConflict).toBe(true)
    vm.metadata.slug = 'precision-sans-outline'
    await nextTick()
    await vm.publishPackage()
    expect(mocks.build).toHaveBeenCalledTimes(1)
    expect(mocks.publish).toHaveBeenLastCalledWith(expect.objectContaining({ sourceFont: source }))
    expect(mocks.push).toHaveBeenCalledWith({ name: 'Fonts' })
  })

  it('locks publish on local package validation failure without invalidating the source', async () => {
    mocks.validate.mockRejectedValueOnce(new Error('PACKAGE_HASH_MISMATCH'))
    const wrapper = mountMaker()
    await upload(wrapper)
    const vm = wrapper.vm as any
    await vm.buildPackage()
    expect(vm.sourceValid).toBe(true)
    expect(vm.localValidationPassed).toBe(false)
    expect(vm.packageValidationError).toContain('PACKAGE_HASH_MISMATCH')
    const publish = wrapper.get('[data-test="publish-button"]')
    expect(publish.attributes('disabled')).toBeDefined()
    expect(publish.attributes('aria-describedby')).toBe('bitmap-publish-help')
    expect(wrapper.get('#bitmap-publish-help').text()).toContain('local validation')
  })

  it('keeps source validity separate from retryable build and publish failures', async () => {
    mocks.build.mockReturnValueOnce({ requestId: 'failed', cancel: mocks.cancel, result: Promise.reject(new Error('worker retry')) })
    const wrapper = mountMaker()
    await upload(wrapper)
    const vm = wrapper.vm as any
    await vm.buildPackage()
    expect(vm.sourceValid).toBe(true)
    expect(vm.buildError).toContain('worker retry')
    mocks.build.mockReturnValueOnce({ requestId: 'ok', cancel: mocks.cancel, result: Promise.resolve({ zip: new ArrayBuffer(2), manifest }) })
    await vm.buildPackage()
    expect(vm.buildError).toBe('')
    mocks.publish.mockRejectedValueOnce(new Error('network retry'))
    await vm.publishPackage()
    expect(vm.sourceValid).toBe(true)
    expect(vm.publishError).toContain('network retry')
  })
})
