// @vitest-environment jsdom
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Design } from '@/types/api/design'
import type { ProductTag } from '@/types/api/productTag'

const mocks = vi.hoisted(() => ({
  getDesignByUid: vi.fn(),
  submitDesign: vi.fn(),
  updateDesign: vi.fn(),
  submitPrgPackageTask: vi.fn(),
  getProductTagsPage: vi.fn(),
  getBundles: vi.fn(),
  messageError: vi.fn(),
  messageSuccess: vi.fn(),
  messageWarning: vi.fn(),
}))

vi.mock('@/api/wristo/design', () => ({
  designApi: {
    getDesignByUid: mocks.getDesignByUid,
    submitDesign: mocks.submitDesign,
    updateDesign: mocks.updateDesign,
    submitPrgPackageTask: mocks.submitPrgPackageTask,
  },
}))
vi.mock('@/api/wristo/productTags', () => ({ getProductTagsPage: mocks.getProductTagsPage }))
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
    mocks.getProductTagsPage.mockResolvedValue({
      code: 0,
      data: { pageNum: 1, pageSize: 20, total: apiTags.length, pages: 1, list: apiTags },
    })
    mocks.getBundles.mockResolvedValue({ code: 0, data: [] })
    mocks.submitDesign.mockResolvedValue({ code: 0, data: true })
    mocks.updateDesign.mockResolvedValue({ code: 0, data: true })
    mocks.submitPrgPackageTask.mockResolvedValue({ code: 0, data: true })
  })

  it('filters options, restores IDs in API order, and submits tagIds', async () => {
    const wrapper = mountDialog()
    await showDialog(wrapper)

    expect(wrapper.find('.dialog').exists()).toBe(true)
    const selector = wrapper.getComponent(StyleTagSelectorStub)
    expect((selector.props('tags') as ProductTag[]).map((item) => item.id)).toEqual([7, 2, 9, 4, 6, 8])
    expect(selector.props('tagIds')).toEqual([7, 2, 9, 4, 6])
    expect(selector.props('disabled')).toBe(false)

    await confirm(wrapper)
    expect(mocks.submitDesign).toHaveBeenCalledWith(expect.objectContaining({ tagIds: [7, 2, 9, 4, 6] }))
  })

  it('passes tagIds through updateDesign before submitting a PRG task', async () => {
    const wrapper = mountDialog()
    await showDialog(wrapper, { mode: 'prg-build', deviceId: 'fenix8' })
    await confirm(wrapper)

    expect(mocks.updateDesign).toHaveBeenCalledWith(expect.objectContaining({ tagIds: [7, 2, 9, 4, 6] }))
    expect(mocks.submitPrgPackageTask).toHaveBeenCalledWith('design-uid', 'fenix8')
  })

  it.each([
    ['rejected', () => Promise.reject(new Error('network'))],
    ['nonzero', () => Promise.resolve({ code: 9, data: null })],
    ['invalid', () => Promise.resolve({ code: 0, data: { list: null } })],
  ])('keeps the dialog open and blocks requests when tag loading is %s', async (_name, response) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.getProductTagsPage.mockImplementationOnce(response)
    const wrapper = mountDialog()
    await showDialog(wrapper)

    expect(wrapper.find('.dialog').exists()).toBe(true)
    expect(wrapper.getComponent(StyleTagSelectorStub).props('disabled')).toBe(true)
    expect(mocks.messageError).toHaveBeenCalledWith('styleTags.loadFailed')

    await confirm(wrapper)
    expect(mocks.submitDesign).not.toHaveBeenCalled()
    expect(mocks.updateDesign).not.toHaveBeenCalled()
    expect(mocks.submitPrgPackageTask).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
