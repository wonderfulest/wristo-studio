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
  repack: vi.fn(),
  construct: vi.fn(),
  loadZip: vi.fn(),
}))

vi.mock('@/features/bitmap-font-maker/fontSource', () => ({
  parseFontSource: mocks.parse,
  checkRequiredGlyphs: mocks.check,
  FontSourceError: class FontSourceError extends Error { constructor(public code: string) { super(code) } },
}))
vi.mock('@/features/bitmap-font-maker/workerClient', () => ({
  BitmapFontWorkerClient: class {
    constructor() { mocks.construct() }
    build = mocks.build
    dispose = mocks.dispose
  },
}))
vi.mock('@/api/wristo/bitmapFontBuild', () => ({
  publishBitmapFontBuild: mocks.publish,
  isBitmapFontSlugConflict: (error: any) => error?.response?.status === 409 || error?.code === 411 || error?.data?.code === 411 || error?.response?.data?.code === 411,
}))
vi.mock('./bitmapPackageRepack', () => ({
  repackageBitmapFontSlug: mocks.repack,
}))
vi.mock('./localPackageValidation', () => ({ validateLocalBitmapPackage: mocks.validate }))
vi.mock('jszip', () => ({ default: { loadAsync: mocks.loadZip } }))
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
    mocks.repack.mockImplementation((zip: ArrayBuffer, current: any, slug: string) => Promise.resolve({ zip, manifest: { ...current, slug } }))
    mocks.loadZip.mockRejectedValue(new Error('preview unavailable'))
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
    const download = wrapper.get('[data-test="download-button"]')
    expect(download.attributes('disabled')).toBeDefined()
    expect(download.attributes('aria-describedby')).toBe('bitmap-download-help')
    expect(wrapper.get('#bitmap-download-help').text()).toContain('Build and locally validate')
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
    await vm.downloadPackage()
    expect(click).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
    wrapper.unmount()
    expect(mocks.dispose).toHaveBeenCalled()
  })

  it('repackages a renamed slug before download without calling the raster worker again', async () => {
    const downloadBytes = new Uint8Array([9, 8, 7]).buffer
    mocks.repack.mockImplementationOnce((_zip: ArrayBuffer, current: any, slug: string) => Promise.resolve({ zip: downloadBytes, manifest: { ...current, slug } }))
    const clicked: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicked.push(this) })
    const wrapper = mountMaker()
    await upload(wrapper)
    const vm = wrapper.vm as any
    await vm.buildPackage()
    vm.metadata.slug = 'precision-renamed'
    await nextTick()
    await vm.downloadPackage()
    expect(mocks.build).toHaveBeenCalledTimes(1)
    expect(mocks.repack).toHaveBeenCalledWith(expect.any(ArrayBuffer), expect.objectContaining({ slug: 'precision-sans' }), 'precision-renamed')
    expect(mocks.validate).toHaveBeenLastCalledWith(expect.objectContaining({ manifest: expect.objectContaining({ slug: 'precision-renamed' }) }), expect.objectContaining({ slug: 'precision-renamed' }))
    expect(clicked.at(-1)?.download).toBe('precision-renamed.zip')
    const downloadedBlob = (URL.createObjectURL as any).mock.calls.at(-1)[0] as Blob
    const downloaded = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(downloadedBlob)
    })
    expect(new Uint8Array(downloaded)).toEqual(new Uint8Array(downloadBytes))
    const button = wrapper.get('[data-test="download-button"]')
    expect(button.attributes('aria-describedby')).toBe('bitmap-download-help')
    expect(wrapper.get('#bitmap-download-help').text()).toContain('current slug')
  })

  it('publishes exact fresh artifacts, preserves freshness on slug conflict, and retries without rasterizing', async () => {
    const wrapper = mountMaker()
    const source = await upload(wrapper)
    const vm = wrapper.vm as any
    await vm.buildPackage()
    vm.metadata.redistributionRightsAttested = true
    vm.styleTagsInput = ' outline, sport, outline,  '
    mocks.publish.mockRejectedValueOnce({ response: { status: 200, data: { code: 411 } } })
    await vm.publishPackage()
    expect(vm.buildFresh).toBe(true)
    expect(vm.slugConflict).toBe(true)
    vm.metadata.slug = 'precision-sans-outline'
    await nextTick()
    await vm.publishPackage()
    expect(mocks.build).toHaveBeenCalledTimes(1)
    expect(mocks.publish).toHaveBeenLastCalledWith(expect.objectContaining({ sourceFont: source }))
    expect(mocks.publish).toHaveBeenLastCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ styleTags: ['outline', 'sport'], redistributionRightsAttested: true, rightsAttestationVersion: 'v1' }) }))
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
    vm.metadata.redistributionRightsAttested = true
    mocks.publish.mockRejectedValueOnce(new Error('network retry'))
    await vm.publishPackage()
    expect(vm.sourceValid).toBe(true)
    expect(vm.publishError).toContain('network retry')
  })

  it('requires redistribution attestation only for publish and enforces tag contract bounds', async () => {
    const wrapper = mountMaker()
    await upload(wrapper)
    const vm = wrapper.vm as any
    await vm.buildPackage()
    expect(wrapper.get('[data-test="download-button"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-test="publish-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('#bitmap-publish-help').text()).toContain('redistribution rights')
    vm.styleTagsInput = Array.from({ length: 17 }, (_, index) => `tag-${index}`).join(',')
    vm.metadata.redistributionRightsAttested = true
    await nextTick()
    expect(wrapper.get('[data-test="publish-button"]').attributes('disabled')).toBeDefined()
    vm.styleTagsInput = Array.from({ length: 16 }, (_, index) => `${String(index).padStart(2, '0')}${'x'.repeat(30)}`).join(',')
    await nextTick()
    expect(wrapper.get('[data-test="publish-button"]').attributes('disabled')).toBeDefined()
    vm.styleTagsInput = ` ${'x'.repeat(32)}, ${'x'.repeat(32)}, sport `
    await nextTick()
    expect(vm.normalizedStyleTags).toEqual(['x'.repeat(32), 'sport'])
    expect(wrapper.get('[data-test="publish-button"]').attributes('disabled')).toBeUndefined()
  })

  it('discards a slow first upload after a faster second font is selected', async () => {
    let resolveFirst!: (value: any) => void
    mocks.parse
      .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve }))
      .mockResolvedValueOnce({ ...parsed, family: 'Second Font', glyphCount: 222 })
    const wrapper = mountMaker()
    const input = wrapper.get('[data-test="source-input"]').element as HTMLInputElement
    const first = new File([new Uint8Array([1])], 'First.ttf')
    const second = new File([new Uint8Array([2])], 'Second.ttf')
    Object.defineProperty(input, 'files', { value: [first], configurable: true })
    input.dispatchEvent(new Event('change'))
    Object.defineProperty(input, 'files', { value: [second], configurable: true })
    input.dispatchEvent(new Event('change'))
    await vi.waitFor(() => expect((wrapper.vm as any).metadata.fullName).toBe('Second Font'))
    resolveFirst({ ...parsed, family: 'First Font', glyphCount: 111 })
    await Promise.resolve()
    expect((wrapper.vm as any).metadata.fullName).toBe('Second Font')
    expect((wrapper.vm as any).sourceFile.name).toBe('Second.ttf')
  })

  it('creates a fresh worker client after a fatal worker failure', async () => {
    const wrapper = mountMaker()
    await upload(wrapper)
    const vm = wrapper.vm as any
    mocks.build.mockReturnValueOnce({ requestId: 'fatal', cancel: mocks.cancel, result: Promise.reject(Object.assign(new Error('fatal'), { code: 'WORKER_FAILED' })) })
    await vm.buildPackage()
    mocks.build.mockReturnValueOnce({ requestId: 'retry', cancel: mocks.cancel, result: Promise.resolve({ zip: new ArrayBuffer(2), manifest }) })
    await vm.buildPackage()
    expect(mocks.construct).toHaveBeenCalledTimes(2)
    expect(mocks.dispose).toHaveBeenCalled()
    expect(vm.buildFresh).toBe(true)
  })

  it('keeps only the newest size preview when ZIP reads finish out of order', async () => {
    let resolveSlow!: (value: any) => void
    const zipFor = (label: string) => ({ file: (path: string) => path.endsWith('.png')
      ? { async: () => Promise.resolve(new Blob([label])) }
      : { async: () => Promise.resolve('common scaleW=16 scaleH=16\nchar id=48 x=0 y=0 width=1 height=1') } })
    const wrapper = mountMaker()
    await upload(wrapper)
    const vm = wrapper.vm as any
    await vm.buildPackage()
    mocks.loadZip.mockReset()
    mocks.loadZip
      .mockImplementationOnce(() => new Promise(resolve => { resolveSlow = resolve }))
      .mockResolvedValueOnce(zipFor('new'))
    ;(URL.createObjectURL as any).mockImplementation((blob: Blob) => `blob:${blob.size}:${Math.random()}`)
    const slow = vm.loadAtlasPreview()
    vm.currentSize = 54
    await nextTick()
    await vi.waitFor(() => expect(vm.atlasUrl).toContain('blob:'))
    const newestUrl = vm.atlasUrl
    resolveSlow(zipFor('old'))
    await slow
    expect(vm.atlasUrl).toBe(newestUrl)
  })

  it('does not create a preview URL when an in-flight ZIP read finishes after unmount', async () => {
    let resolveZip!: (value: any) => void
    const wrapper = mountMaker()
    await upload(wrapper)
    const vm = wrapper.vm as any
    await vm.buildPackage()
    mocks.loadZip.mockReset()
    mocks.loadZip.mockImplementationOnce(() => new Promise(resolve => { resolveZip = resolve }))
    const pending = vm.loadAtlasPreview()
    const before = (URL.createObjectURL as any).mock.calls.length
    wrapper.unmount()
    resolveZip({ file: () => ({ async: () => Promise.resolve(new Blob(['late'])) }) })
    await pending
    expect((URL.createObjectURL as any).mock.calls.length).toBe(before)
  })

  it('serializes package preparation and discards a download when metadata changes', async () => {
    let resolveRepack!: (value: any) => void
    mocks.repack.mockImplementationOnce(() => new Promise(resolve => { resolveRepack = resolve }))
    const wrapper = mountMaker()
    await upload(wrapper)
    const vm = wrapper.vm as any
    await vm.buildPackage()
    vm.metadata.slug = 'first-download'
    const first = vm.downloadPackage()
    const second = vm.downloadPackage()
    expect(mocks.repack).toHaveBeenCalledTimes(1)
    vm.metadata.slug = 'changed-during-download'
    resolveRepack({ zip: new ArrayBuffer(2), manifest: { ...manifest, slug: 'first-download' } })
    await Promise.all([first, second])
    expect(vm.downloadError).toContain('changed while')
    expect(vm.downloading).toBe(false)
  })

  it('does not write package validation errors after an in-flight build is unmounted', async () => {
    let rejectValidation!: (error: Error) => void
    mocks.validate.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectValidation = reject }))
    const wrapper = mountMaker()
    await upload(wrapper)
    const vm = wrapper.vm as any
    const build = vm.buildPackage()
    await vi.waitFor(() => expect(mocks.validate).toHaveBeenCalled())
    wrapper.unmount()
    rejectValidation(new Error('late validation failure'))
    await build
    expect(vm.packageValidationError).toBe('')
  })
})
