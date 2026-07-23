// @vitest-environment jsdom
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Design } from '@/types/api/design'

const mocks = vi.hoisted(() => ({
  getProductTagsPage: vi.fn(),
  getBundles: vi.fn(),
  publish: vi.fn(),
  messageError: vi.fn(),
  messageSuccess: vi.fn(),
  messageWarning: vi.fn(),
  buildProductImageArchive: vi.fn(),
  saveProductImageArchive: vi.fn(),
}))

vi.mock('@/api/wristo/productTags', () => ({ getProductTagsPage: mocks.getProductTagsPage }))
vi.mock('@/api/wristo/products', () => ({
  productsApi: {
    getBundles: mocks.getBundles,
    publish: mocks.publish,
    generateDescription: vi.fn(),
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
  ElButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot/></button>' },
  ElLink: true,
  ElTooltip: { template: '<div><slot/></div>' },
  ElIcon: { template: '<span><slot/></span>' },
  ElUpload: true,
  ElDropdown: { template: '<div><slot/><slot name="dropdown"/></div>' },
  ElDropdownMenu: { template: '<div><slot/></div>' },
  ElDropdownItem: {
    props: ['command'],
    emits: ['click'],
    template: '<button :data-download-mode="command" @click="$emit(\'click\')"><slot/></button>',
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
    mocks.getProductTagsPage.mockResolvedValue({ code: 0, data: { list: [] } })
    mocks.getBundles.mockResolvedValue({ code: 0, data: [] })
    mocks.publish.mockResolvedValue({ code: 0, data: true })
  })

  it('shows product and social images separately with one shared count', async () => {
    const wrapper = mountDialog()
    await showDialog(wrapper)

    const editors = wrapper.findAllComponents(ProductImagesEditorStub)
    expect(editors).toHaveLength(2)
    expect(editors[0].props('imageType')).toBe('product')
    expect(editors[0].props('modelValue')).toHaveLength(1)
    expect(editors[1].props('imageType')).toBe('social')
    expect(editors[1].props('modelValue')).toHaveLength(2)
    expect(editors.map((editor) => editor.props('totalCount'))).toEqual([3, 3])
    expect(editors.map((editor) => editor.props('maxTotal'))).toEqual([20, 20])
  })
})
