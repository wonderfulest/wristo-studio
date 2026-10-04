// @vitest-environment jsdom
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Design } from '@/types/api/design'

const mocks = vi.hoisted(() => ({
  getAiCapabilities: vi.fn(),
  getProductTagsPage: vi.fn(),
  getProductTagGeneration: vi.fn(),
  getBundles: vi.fn(),
  generateBanner: vi.fn(),
  getBannerGeneration: vi.fn(),
  publish: vi.fn(),
  messageError: vi.fn(),
  messageSuccess: vi.fn(),
  messageWarning: vi.fn(),
  buildProductImageArchive: vi.fn(),
  saveProductImageArchive: vi.fn(),
}))

vi.mock('@/api/wristo/studioAi', () => ({ getAiCapabilities: mocks.getAiCapabilities }))
vi.mock('@/api/wristo/productTags', () => ({ getProductTagsPage: mocks.getProductTagsPage, getProductTagGeneration: mocks.getProductTagGeneration, generateProductTags: vi.fn() }))
vi.mock('@/api/wristo/products', () => ({
  productsApi: {
    getBundles: mocks.getBundles,
    publish: mocks.publish,
    generateDescription: vi.fn(),
    generateBanner: mocks.generateBanner,
    getBannerGeneration: mocks.getBannerGeneration,
  },
}))
vi.mock('@/stores/message', () => ({
  useMessageStore: () => ({
    error: mocks.messageError,
    success: mocks.messageSuccess,
    warning: mocks.messageWarning,
  }),
}))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    isMerchantUser: true,
    isAdminUser: false,
    userInfo: { id: 10 },
    editorDevice: { deviceId: 'fenix7' },
  }),
}))
vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}))
vi.mock('@/components/common/productImageDownload', () => ({
  buildProductImageArchive: mocks.buildProductImageArchive,
  saveProductImageArchive: mocks.saveProductImageArchive,
}))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn() },
  ElLoading: { service: vi.fn(() => ({ close: vi.fn() })) },
}))

import GoLiveDialog from './GoLiveDialog.vue'

const design = {
  product: {
    id: 20,
    appId: 200,
    name: 'Product',
    description: 'Description',
    categories: [],
    tags: [],
    bundles: [],
    payment: null,
    trialLasts: 0.25,
    garminImageUrl: 'https://image.test/hero.png',
    rawImageUrl: '',
    bannerImageUrl: '',
    garminStoreUrl: 'https://apps.garmin.com/app',
    youtubeUrl: '',
    productImages: [
      { id: 1, type: 'product', imageUrl: '/product.png' },
      { id: 2, type: 'social', imageUrl: '/social.png' },
      { id: 3, type: 'share', imageUrl: '/share.png' },
      { id: 4, type: 'pinterest', imageUrl: '/pinterest.png' },
    ],
    lastGoLive: null,
  },
} as unknown as Design

const ElFormStub = defineComponent({
  setup(_, { slots, expose }) {
    expose({ validate: vi.fn().mockResolvedValue(true) })
    return () => h('form', slots.default?.())
  },
})

const ProductImagesEditorStub = defineComponent({
  name: 'ProductImagesEditor',
  props: {
    modelValue: { type: Array, required: true },
    imageType: { type: String, required: true },
    totalCount: { type: Number, required: true },
    maxTotal: { type: Number, required: true },
  },
  emits: ['update:modelValue'],
  template: '<div class="product-images-editor" :data-type="imageType" />',
})

const ElDropdownStub = defineComponent({
  name: 'ElDropdown',
  props: { disabled: Boolean },
  emits: ['command'],
  template: `
    <div class="download-dropdown" :data-disabled="String(disabled)">
      <button data-download-mode="thumbnail" @click="$emit('command', 'thumbnail')">thumbnail</button>
      <button data-download-mode="original" @click="$emit('command', 'original')">original</button>
      <button data-download-mode="all" @click="$emit('command', 'all')">all</button>
    </div>
  `,
})

const stubs = {
  ElDialog: {
    props: ['modelValue'],
    template: '<div v-if="modelValue" class="dialog"><slot/><slot name="footer"/></div>',
  },
  ElForm: ElFormStub,
  ElFormItem: { template: '<div><slot/></div>' },
  ElInput: { template: '<div><slot name="append"/></div>' },
  ElInputNumber: true,
  ElRadioGroup: { template: '<div><slot/></div>' },
  ElRadio: { template: '<span><slot/></span>' },
  ElRadioButton: { template: '<span><slot/></span>' },
  ElButton: { emits: ['click'], template: '<button @click="$emit(\'click\', $event)"><slot/></button>' },
  ElLink: true,
  ElTooltip: { template: '<div><slot/></div>' },
  ElIcon: { template: '<span><slot/></span>' },
  ElUpload: { template: '<div><slot/></div>' },
  ElDropdown: ElDropdownStub,
  ElDropdownMenu: { template: '<div><slot/></div>' },
  ElDropdownItem: {
    props: ['command'],
    emits: ['click'],
    template: '<button :data-download-mode="command" @click="$emit(\'click\', $event)"><slot/></button>',
  },
  ImageUpload: true,
  ProductImagesEditor: ProductImagesEditorStub,
  ProductTagSelector: true,
  BundleSelector: true,
  DesignerDefaultConfigDialog: true,
}

const mountDialog = () => mount(GoLiveDialog, { global: { stubs } })

const showDialog = async (wrapper: ReturnType<typeof mountDialog>, value = design) => {
  ;(wrapper.vm as unknown as { show: (input: Design) => void }).show(value)
  await flushPromises()
  await nextTick()
}

describe('GoLiveDialog product image behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAiCapabilities.mockResolvedValue({ code: 0, data: { TAGS: true, DESCRIPTION: true, BANNER: true } })
    mocks.getProductTagGeneration.mockResolvedValue({ code: 0, data: { status: 'ready', canGenerate: true, tags: [] } })
    mocks.getProductTagsPage.mockResolvedValue({ code: 0, data: { list: [] } })
    mocks.getBundles.mockResolvedValue({ code: 0, data: [] })
    mocks.publish.mockResolvedValue({ code: 0, data: true })
  })

  afterEach(() => { vi.useRealTimers() })

  it('blocks disabled banner generation and preserves the uploaded image', async () => {
    mocks.getAiCapabilities.mockResolvedValue({ code: 0, data: { TAGS: true, DESCRIPTION: true, BANNER: false } })
    const wrapper = mountDialog()
    ;(wrapper.vm as unknown as { show: (value: Design) => void }).show({ ...design, product: { ...design.product, bannerImageUrl: 'https://cdn.wristo.io/old.jpg' } } as Design)
    await flushPromises()
    await wrapper.get('.banner-refresh').trigger('click')
    expect(mocks.generateBanner).not.toHaveBeenCalled()
    expect(wrapper.get('.banner-area img').attributes('src')).toContain('old.jpg')
    expect(wrapper.text()).toContain('goLive.aiUnavailable')
  })

  it('polls a running task and stops polling when the dialog closes', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    mocks.generateBanner.mockResolvedValue({ data: { id: 'job', status: 'running' } })
    mocks.getBannerGeneration.mockResolvedValue({ data: { id: 'job', status: 'succeeded', imageUrl: 'https://cdn.wristo.io/polled.jpg' } })
    const wrapper = mountDialog()
    await showDialog(wrapper)
    await wrapper.get('.banner-refresh').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    await vi.advanceTimersByTimeAsync(2500)
    await flushPromises()
    expect(mocks.getBannerGeneration).toHaveBeenCalledWith(20, 'job')
    expect(wrapper.get('.banner-area img').attributes('src')).toContain('polled.jpg')
    await wrapper.get('.banner-refresh').trigger('click')
    await flushPromises()
    const cancel = wrapper.findAll('button').find(button => button.text() === 'common.cancel')!
    await cancel.trigger('click')
    await vi.advanceTimersByTimeAsync(2500)
    expect(mocks.getBannerGeneration).toHaveBeenCalledTimes(1)
  })

  it('generates only on click and displays the completed banner', async () => {
    mocks.generateBanner.mockResolvedValue({ data: { id: 'job', status: 'succeeded', imageUrl: 'https://cdn.wristo.io/banner.jpg' } })
    const wrapper = mountDialog()
    await showDialog(wrapper)
    expect(mocks.generateBanner).not.toHaveBeenCalled()
    await wrapper.get('.banner-refresh').trigger('click')
    await flushPromises()
    expect(mocks.generateBanner).toHaveBeenCalledWith({ productId: 20, deviceId: 'fenix7' })
    expect(wrapper.get('.banner-area img').attributes('src')).toBe('https://cdn.wristo.io/banner.jpg')
  })

  it('retains the old banner on failure and ignores a result after switching designs', async () => {
    const wrapper = mountDialog()
    const original = { ...design, product: { ...design.product, bannerImageUrl: 'https://cdn.wristo.io/old.jpg' } } as Design
    await showDialog(wrapper, original)
    mocks.generateBanner.mockResolvedValue({ data: { id: 'job', status: 'failed' } })
    await wrapper.get('.banner-refresh').trigger('click')
    await flushPromises()
    expect(wrapper.get('.banner-area img').attributes('src')).toContain('old.jpg')
    let resolve!: (value: unknown) => void
    mocks.generateBanner.mockImplementation(() => new Promise((done) => { resolve = done }))
    await wrapper.get('.banner-refresh').trigger('click')
    await wrapper.get('.banner-refresh').trigger('click')
    expect(mocks.generateBanner).toHaveBeenCalledTimes(2)
    await showDialog(wrapper, { ...original, product: { ...original.product, id: 21 } } as Design)
    resolve({ data: { id: 'job', status: 'succeeded', imageUrl: 'https://cdn.wristo.io/stale.jpg' } })
    await flushPromises()
    expect(wrapper.get('.banner-area img').attributes('src')).toContain('old.jpg')
  })

  it('shows product and social images separately with one shared count', async () => {
    const wrapper = mountDialog()
    await showDialog(wrapper)

    const editors = wrapper.findAllComponents(ProductImagesEditorStub)
    expect(editors).toHaveLength(2)
    expect(editors[0].props('imageType')).toBe('product')
    expect(editors[0].props('modelValue')).toHaveLength(1)
    expect(editors[1].props('imageType')).toBe('social')
    expect(editors[1].props('modelValue')).toHaveLength(3)
    expect(editors[1].props('modelValue')).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 4, type: 'pinterest' })]),
    )
    expect(editors.map((editor) => editor.props('totalCount'))).toEqual([4, 4])
    expect(editors.map((editor) => editor.props('maxTotal'))).toEqual([20, 20])
  })

  it('publishes pinterest selections without changing their type', async () => {
    const wrapper = mountDialog()
    await showDialog(wrapper)

    const submitButton = wrapper.findAll('button')
      .find((button) => button.text() === 'common.submit')
    expect(submitButton).toBeDefined()
    await submitButton!.trigger('click')
    await flushPromises()

    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({
      productImages: [
        { imageId: 1, type: 'product', sortOrder: 0 },
        { imageId: 2, type: 'social', sortOrder: 1 },
        { imageId: 3, type: 'social', sortOrder: 2 },
        { imageId: 4, type: 'pinterest', sortOrder: 3 },
      ],
    }))
  })

  it('downloads all product and social sizes and reports partial failures', async () => {
    const archive = new Blob(['zip'])
    mocks.buildProductImageArchive.mockResolvedValue({
      blob: archive,
      downloaded: 6,
      failed: 1,
    })
    const wrapper = mountDialog()
    await showDialog(wrapper)

    await wrapper.get('[data-download-mode="all"]').trigger('click')
    await flushPromises()

    expect(mocks.buildProductImageArchive).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: 'product' }),
        expect.objectContaining({ type: 'social' }),
        expect.objectContaining({ type: 'share' }),
        expect.objectContaining({ type: 'pinterest' }),
      ]),
      'all',
    )
    expect(mocks.saveProductImageArchive).toHaveBeenCalledWith(archive, 200)
    expect(mocks.messageWarning).toHaveBeenCalledWith(
      'goLive.imageDownloadPartial:{"count":1}',
    )
  })

  it('does not save an empty archive when all downloads fail', async () => {
    mocks.buildProductImageArchive.mockResolvedValue({
      blob: null,
      downloaded: 0,
      failed: 3,
    })
    const wrapper = mountDialog()
    await showDialog(wrapper)

    await wrapper.get('[data-download-mode="original"]').trigger('click')
    await flushPromises()

    expect(mocks.saveProductImageArchive).not.toHaveBeenCalled()
    expect(mocks.messageError).toHaveBeenCalledWith('goLive.imageDownloadFailed')
  })

  it('disables the download selector when the app has no product images', async () => {
    const wrapper = mountDialog()
    const emptyDesign = {
      ...design,
      product: { ...design.product, productImages: [] },
    } as unknown as Design
    await showDialog(wrapper, emptyDesign)

    expect(wrapper.getComponent(ElDropdownStub).props('disabled')).toBe(true)
  })
})
