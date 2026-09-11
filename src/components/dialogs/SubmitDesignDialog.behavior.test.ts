// @vitest-environment jsdom
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Design } from '@/types/api/design'
import type { ProductTag } from '@/types/api/productTag'

const mocks = vi.hoisted(() => ({
  getDesignByUid: vi.fn(),
  submitDesign: vi.fn(),
  checkSourceDuplicate: vi.fn(),
  updateDesign: vi.fn(),
  submitPrgPackageTask: vi.fn(),
  getDsnProductTagsPage: vi.fn(),
  getBundles: vi.fn(),
  messageError: vi.fn(),
  messageSuccess: vi.fn(),
  messageWarning: vi.fn(),
}))

vi.mock('@/api/wristo/design', () => ({
  designApi: {
    getDesignByUid: mocks.getDesignByUid,
    submitDesign: mocks.submitDesign,
    checkSourceDuplicate: mocks.checkSourceDuplicate,
    updateDesign: mocks.updateDesign,
    submitPrgPackageTask: mocks.submitPrgPackageTask,
  },
}))
vi.mock('@/api/wristo/productTags', () => ({ getProductTagsPage: mocks.getDsnProductTagsPage }))
vi.mock('@/api/wristo/products', () => ({
  productsApi: { getBundles: mocks.getBundles, generateDescription: vi.fn() },
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
    userInfo: { id: 10, device: { deviceId: 'device' } },
  }),
}))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn(), success: vi.fn() } }))

import SubmitDesignDialog from './SubmitDesignDialog.vue'

const tag = (id: number, tagGroup = 'style', status = 1): ProductTag => ({
  id,
  name: `tag-${id}`,
  slug: `tag-${id}`,
  tagGroup,
  sort: id,
  status,
})

const selectedTags = [tag(8), tag(6), tag(4), tag(9), tag(2), tag(7), tag(404)]
const apiTags = [tag(7), tag(2), tag(100, 'feature'), tag(9), tag(101, 'style', 0), tag(4), tag(6), tag(8)]

const designDetail = {
  designUid: 'design-uid',
  name: 'Design',
  description: 'Description',
  product: {
    id: 22,
    trialLasts: 0.25,
    tags: selectedTags,
    bundles: [],
    payment: null,
    lastGoLive: null,
  },
} as unknown as Design

const ElFormStub = defineComponent({
  setup(_, { slots, expose }) {
    expose({ validate: vi.fn().mockResolvedValue(true) })
    return () => h('form', slots.default?.())
  },
})

const StyleTagSelectorStub = defineComponent({
  name: 'StyleTagSelector',
  props: {
    tagIds: { type: Array, required: true },
    tags: { type: Array, required: true },
    loading: Boolean,
    disabled: Boolean,
  },
  emits: ['update:tagIds'],
  template: '<div class="style-tag-selector" />',
})

const stubs = {
  ElDialog: {
    props: ['modelValue'],
    template: '<div v-if="modelValue" class="dialog"><slot/><slot name="footer"/></div>',
  },
  ElForm: ElFormStub,
  ElFormItem: { template: '<div><slot/></div>' },
  ElInput: true,
  ElInputNumber: true,
  ElRadioGroup: { template: '<div><slot/></div>' },
  ElRadio: { template: '<span><slot/></span>' },
  ElRadioButton: { template: '<span><slot/></span>' },
  ElButton: {
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot/></button>',
  },
  StyleTagSelector: StyleTagSelectorStub,
  BundleSelector: true,
}

const mountDialog = () => mount(SubmitDesignDialog, { global: { stubs } })

type ShowOptions = { mode: 'prg-build'; deviceId: string }

const showDialog = async (wrapper: ReturnType<typeof mountDialog>, options?: ShowOptions) => {
  await (wrapper.vm as unknown as { show: (design: Design, options?: ShowOptions) => Promise<void> }).show(designDetail, options)
  await flushPromises()
  await nextTick()
}

const confirm = async (wrapper: ReturnType<typeof mountDialog>) => {
  await wrapper.findAll('button').at(-1)!.trigger('click')
  await flushPromises()
}

describe('SubmitDesignDialog style tag behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getDesignByUid.mockResolvedValue({ code: 0, data: designDetail })
    mocks.getDsnProductTagsPage.mockResolvedValue({
      code: 0,
      data: { pageNum: 1, pageSize: 20, total: apiTags.length, pages: 1, list: apiTags },
    })
    mocks.getBundles.mockResolvedValue({ code: 0, data: [] })
    mocks.submitDesign.mockResolvedValue({ code: 0, data: true })
    mocks.checkSourceDuplicate.mockResolvedValue({ code: 0, data: false })
    mocks.updateDesign.mockResolvedValue({ code: 0, data: true })
    mocks.submitPrgPackageTask.mockResolvedValue({ code: 0, data: true })
  })

  it.each([undefined, { mode: 'prg-build' as const, deviceId: 'fenix8' }])('submits without editing publishing metadata (%s)', async (options) => {
    const wrapper = mountDialog()
    await showDialog(wrapper, options)
    expect(wrapper.findComponent(StyleTagSelectorStub).exists()).toBe(false)
    expect(mocks.getDsnProductTagsPage).not.toHaveBeenCalled()
    await confirm(wrapper)
    const request = options ? mocks.updateDesign : mocks.submitDesign
    expect(request).toHaveBeenCalledOnce()
    expect(request.mock.calls[0][0]).not.toHaveProperty('tagIds')
    expect(request.mock.calls[0][0]).not.toHaveProperty('description')
    if (options) expect(mocks.submitPrgPackageTask).toHaveBeenCalledWith('design-uid', 'fenix8')
  })

  it.each([
    [undefined, 2.39],
    [1.99, 1.99],
    [1.98, null],
    [5.99, 5.99],
    [6, null],
  ])('enforces paid pricing for input %s', async (price, expectedPrice) => {
    mocks.getDesignByUid.mockResolvedValueOnce({
      code: 0,
      data: {
        ...designDetail,
        product: {
          ...designDetail.product,
          payment: { paymentMethod: 'wpay', price, trialLasts: 0.25 },
        },
      },
    })
    const wrapper = mountDialog()
    await showDialog(wrapper)
    await confirm(wrapper)

    if (expectedPrice === null) {
      expect(mocks.submitDesign).not.toHaveBeenCalled()
      expect(mocks.messageError).toHaveBeenCalledWith('submitDesign.priceRange')
    } else {
      expect(mocks.submitDesign.mock.calls[0][0].price).toBe(expectedPrice)
    }
  })

  it('identifies ordinary submissions separately from PRG builds', async () => {
    const wrapper = mountDialog()
    await showDialog(wrapper)
    await confirm(wrapper)

    expect(wrapper.emitted('success')).toEqual([[{ mode: 'submit' }]])
  })

  it('blocks submission when the source platform and source ID already exist', async () => {
    mocks.getDesignByUid.mockResolvedValueOnce({
      code: 0,
      data: {
        ...designDetail,
        originalType: 'non_original',
        sourcePlatform: 'facer',
        sourceId: 'https://facer.io/watchface/123',
      },
    })
    mocks.checkSourceDuplicate.mockResolvedValueOnce({ code: 0, data: true })
    const wrapper = mountDialog()
    await showDialog(wrapper)

    await confirm(wrapper)

    expect(mocks.checkSourceDuplicate).toHaveBeenCalledWith({
      sourcePlatform: 'facer',
      sourceId: 'https://facer.io/watchface/123',
      designUid: 'design-uid',
    })
    expect(mocks.messageError).toHaveBeenCalledWith('designSource.duplicate')
    expect(mocks.submitDesign).not.toHaveBeenCalled()
  })

})
