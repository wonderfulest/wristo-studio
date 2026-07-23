// @vitest-environment jsdom
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Design } from '@/types/api/design'
import type { ProductTag } from '@/types/api/productTag'

const mocks = vi.hoisted(() => ({
  getProductTagsPage: vi.fn(),
  getBundles: vi.fn(),
  publish: vi.fn(),
  messageError: vi.fn(),
  messageSuccess: vi.fn(),
  messageWarning: vi.fn(),
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
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn() },
  ElLoading: { service: vi.fn(() => ({ close: vi.fn() })) },
}))

import GoLiveDialog from './GoLiveDialog.vue'

const tag = (id: number, tagGroup: string, status = 1): ProductTag => ({
  id,
  name: `tag-${id}`,
  slug: `tag-${id}`,
  tagGroup,
  sort: id,
  status,
})

const apiTags = [
  tag(1, 'style'),
  tag(28, 'function'),
  tag(38, 'scene'),
  tag(49, 'seasonal'),
  tag(99, 'style', 0),
]

const design = {
  product: {
    id: 20,
    appId: 200,
    name: 'Product',
    description: 'Description',
    categories: [{ id: 777 }],
    tags: [apiTags[3], apiTags[1]],
    bundles: [],
    payment: null,
    trialLasts: 0.25,
    garminImageUrl: 'https://image.test/hero.png',
    rawImageUrl: '',
    bannerImageUrl: '',
    garminStoreUrl: 'https://apps.garmin.com/app',
    youtubeUrl: '',
    productImages: [],
    lastGoLive: null,
  },
} as unknown as Design

const ElFormStub = defineComponent({
  setup(_, { slots, expose }) {
    expose({ validate: vi.fn().mockResolvedValue(true) })
    return () => h('form', slots.default?.())
  },
})

const ProductTagSelectorStub = defineComponent({
  name: 'ProductTagSelector',
  props: {
    tagIds: { type: Array, required: true },
    tags: { type: Array, required: true },
    loading: Boolean,
    disabled: Boolean,
  },
  emits: ['update:tagIds'],
  template: '<div class="product-tag-selector" />',
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
  ElDropdownItem: { template: '<span><slot/></span>' },
  ImageUpload: true,
  ProductImagesEditor: true,
  ProductTagSelector: ProductTagSelectorStub,
  BundleSelector: true,
  DesignerDefaultConfigDialog: true,
}

const mountDialog = () => mount(GoLiveDialog, { global: { stubs } })

const showDialog = async (wrapper: ReturnType<typeof mountDialog>) => {
  ;(wrapper.vm as unknown as { show: (value: Design) => void }).show(design)
  await flushPromises()
  await nextTick()
}

const confirm = async (wrapper: ReturnType<typeof mountDialog>) => {
  await wrapper.findAll('button').at(-1)!.trigger('click')
  await flushPromises()
}

describe('GoLiveDialog product tag behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getProductTagsPage.mockResolvedValue({ code: 0, data: { list: apiTags } })
    mocks.getBundles.mockResolvedValue({ code: 0, data: [] })
    mocks.publish.mockResolvedValue({ code: 0, data: true })
  })

  it('shows all enabled groups, restores product tags, and publishes tagIds only', async () => {
    const wrapper = mountDialog()
    await showDialog(wrapper)

    const selector = wrapper.getComponent(ProductTagSelectorStub)
    expect((selector.props('tags') as ProductTag[]).map((item) => item.id)).toEqual([1, 28, 38, 49])
    expect(selector.props('tagIds')).toEqual([28, 49])
    expect(selector.props('disabled')).toBe(false)

    await confirm(wrapper)

    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({ tagIds: [28, 49] }))
    expect(mocks.publish.mock.calls[0][0]).not.toHaveProperty('categoryIds')
  })

  it.each([
    ['rejected', () => Promise.reject(new Error('network'))],
    ['nonzero', () => Promise.resolve({ code: 9, data: null })],
    ['invalid', () => Promise.resolve({ code: 0, data: { list: null } })],
  ])('keeps the dialog open and blocks publishing when tag loading is %s', async (_name, response) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.getProductTagsPage.mockImplementationOnce(response)
    const wrapper = mountDialog()
    await showDialog(wrapper)

    expect(wrapper.find('.dialog').exists()).toBe(true)
    expect(wrapper.getComponent(ProductTagSelectorStub).props('disabled')).toBe(true)
    expect(mocks.messageError).toHaveBeenCalledWith('productTags.loadFailed')

    await confirm(wrapper)
    expect(mocks.publish).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
