import Schema from 'async-validator'
// @vitest-environment jsdom
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Design } from '@/types/api/design'
import type { ProductTag } from '@/types/api/productTag'

const mocks = vi.hoisted(() => ({
  confirmCost: vi.fn(),
  getDescriptionConfig: vi.fn(),
  getAiCapabilities: vi.fn(),
  getAiPrices: vi.fn(),
  getProductTagsPage: vi.fn(),
  getProductTagGeneration: vi.fn(),
  generateProductTags: vi.fn(),
  getDesignByUid: vi.fn(),
  getBundles: vi.fn(),
  publish: vi.fn(),
  generateDescription: vi.fn(),
  messageError: vi.fn(),
  messageSuccess: vi.fn(),
  messageWarning: vi.fn()
}))

vi.mock('@/api/wristo/design', () => ({ designApi: { getDesignByUid: mocks.getDesignByUid } }))
vi.mock('@/api/wristo/designerDefaultConfig', () => ({ designerDefaultConfigApi: { getByUserId: mocks.getDescriptionConfig } }))
vi.mock('@/api/wristo/studioAi', () => ({ getAiCapabilities: mocks.getAiCapabilities, getAiPrices: mocks.getAiPrices }))
vi.mock('@/api/wristo/productTags', () => ({ getProductTagsPage: mocks.getProductTagsPage, getProductTagGeneration: mocks.getProductTagGeneration, generateProductTags: mocks.generateProductTags }))
vi.mock('@/api/wristo/products', () => ({
  productsApi: {
    getBundles: mocks.getBundles,
    publish: mocks.publish,
    generateDescription: mocks.generateDescription
  }
}))
vi.mock('@/stores/message', () => ({
  useMessageStore: () => ({
    error: mocks.messageError,
    success: mocks.messageSuccess,
    warning: mocks.messageWarning
  })
}))
vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    isMerchantUser: true,
    isAdminUser: false,
    userInfo: { id: 10 }
  })
}))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('element-plus', () => ({
  ElMessageBox: { confirm: mocks.confirmCost },
  ElMessage: { error: vi.fn(), success: vi.fn() },
  ElLoading: { service: vi.fn(() => ({ close: vi.fn() })) }
}))

import { ElMessage } from 'element-plus'
import GoLiveDialog from './GoLiveDialog.vue'

const tag = (id: number, tagGroup: string, status = 1): ProductTag => ({
  id,
  name: `tag-${id}`,
  slug: `tag-${id}`,
  tagGroup,
  sort: id,
  status
})

const apiTags = [tag(1, 'style'), tag(28, 'function'), tag(38, 'scene'), tag(49, 'seasonal'), tag(99, 'style', 0)]

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
    lastGoLive: null
  }
} as unknown as Design

const ElFormStub = defineComponent({
  props: ['model', 'rules'],
  setup(props, { slots, expose }) {
    expose({ validate: () => new Schema(props.rules).validate(props.model).then(() => true) })
    return () => h('form', slots.default?.())
  }
})

const ProductTagSelectorStub = defineComponent({
  name: 'ProductTagSelector',
  props: {
    tagIds: { type: Array, required: true },
    tags: { type: Array, required: true },
    loading: Boolean,
    disabled: Boolean,
    showGeneration: Boolean,
    canGenerate: Boolean,
    generating: Boolean,
    generationStatus: String
  },
  emits: ['update:tagIds', 'generate'],
  template: '<div class="product-tag-selector" />'
})

const stubs = {
  ElDialog: {
    props: ['modelValue'],
    template: '<div v-if="modelValue" class="dialog"><slot/><slot name="footer"/></div>'
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
  DesignerDefaultConfigDialog: true
}

const mountDialog = () => mount(GoLiveDialog, { global: { stubs } })

const showDialog = async (wrapper: ReturnType<typeof mountDialog>) => {
  ;(wrapper.vm as unknown as { show: (value: Design) => void }).show(structuredClone(design))
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
    mocks.getAiPrices.mockResolvedValue({ code: 0, data: { TAGS: 2, DESCRIPTION: 3, BANNER: 7 } })
    mocks.getAiCapabilities.mockResolvedValue({ code: 0, data: { TAGS: true, DESCRIPTION: true, BANNER: true } })
    mocks.getProductTagsPage.mockResolvedValue({ code: 0, data: { list: apiTags } })
    mocks.getProductTagGeneration.mockResolvedValue({ code: 0, data: { status: 'existing', canGenerate: false, tags: design.product.tags } })
    mocks.getBundles.mockResolvedValue({ code: 0, data: [] })
    mocks.publish.mockResolvedValue({ code: 0, data: true })
  })

  it.each(['wristo', 'garmin'])('loads source details only when the %s link is clicked', async (store) => {
    const target = { opener: {}, location: { href: '' }, close: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(target as unknown as Window)
    mocks.getDesignByUid.mockResolvedValue({ code: 0, data: {
      product: { appId: 123456, garminStoreUrl: 'https://apps.garmin.com/apps/source-app' }
    } })
    const wrapper = mountDialog()
    ;(wrapper.vm as unknown as { show: (value: Design) => void }).show({
      ...design, copiedFromDesignUid: 'source-design'
    })
    await flushPromises()
    expect(mocks.getDesignByUid).not.toHaveBeenCalled()
    const links = wrapper.get('.source-design-links').findAll('el-link-stub')
    expect(links[0].attributes('href')).toBe('https://studio.wristo.io/design?id=source-design')
    await links[store === 'wristo' ? 1 : 2].trigger('click')
    await flushPromises()
    expect(mocks.getDesignByUid).toHaveBeenCalledWith('source-design', { populate: 'product' })
    expect(target.location.href).toBe(store === 'wristo'
      ? 'https://wristo.io/app/123456' : 'https://apps.garmin.com/apps/source-app')
    expect(target.opener).toBeNull()
    expect(wrapper.get('.source-design-links').text()).toContain('123456')
    await showDialog(wrapper)
    expect(wrapper.find('.source-design-links').exists()).toBe(false)
    open.mockRestore()
  })

  it('hides AI entries when disabled but preserves plain template generation', async () => {
    mocks.getAiCapabilities.mockResolvedValue({ code: 0, data: { TAGS: false, DESCRIPTION: false, BANNER: false } })
    mocks.getDescriptionConfig.mockResolvedValue({ code: 0, data: { descriptionTemplate: 'Plain template' } })
    const wrapper = mountDialog()
    ;(wrapper.vm as unknown as { show: (value: Design) => void }).show(design)
    await flushPromises()
    expect(wrapper.getComponent(ProductTagSelectorStub).props('showGeneration')).toBe(false)
    expect(wrapper.find('.banner-refresh').exists()).toBe(false)
    expect(wrapper.find('.ai-credit-hint').exists()).toBe(false)
    expect(wrapper.findAll('button').some(button => button.text() === 'goLive.generateDescription')).toBe(true)
  })

  it('hides description generation when its template needs disabled AI', async () => {
    mocks.getAiCapabilities.mockResolvedValue({ code: 0, data: { TAGS: false, DESCRIPTION: false, BANNER: false } })
    mocks.getDescriptionConfig.mockResolvedValue({ code: 0, data: { descriptionTemplate: '[[${app_ai_description}]]' } })
    const wrapper = mountDialog()
    ;(wrapper.vm as unknown as { show: (value: Design) => void }).show(design)
    await flushPromises()
    expect(wrapper.findAll('button').some(button => button.text() === 'goLive.generateDescription')).toBe(false)
    expect(mocks.generateDescription).not.toHaveBeenCalled()
  })

  it('closes the blank tab and reports a missing source store URL', async () => {
    const target = { opener: null, location: { href: '' }, close: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(target as unknown as Window)
    mocks.getDesignByUid.mockResolvedValue({ code: 0, data: {} })
    const wrapper = mountDialog()
    ;(wrapper.vm as unknown as { show: (value: Design) => void }).show({
      ...design, copiedFromDesignUid: 'source-design'
    })
    await flushPromises()
    await wrapper.get('.source-design-links').findAll('el-link-stub')[2].trigger('click')
    await flushPromises()
    expect(target.close).toHaveBeenCalled()
    expect(mocks.messageWarning).toHaveBeenCalledWith('goLive.sourceLinkUnavailable')
    open.mockRestore()
  })

  it('shows all enabled groups, restores product tags, and publishes tags in the description', async () => {
    const wrapper = mountDialog()
    await showDialog(wrapper)

    const selector = wrapper.getComponent(ProductTagSelectorStub)
    expect((selector.props('tags') as ProductTag[]).map((item) => item.id)).toEqual([1, 28, 38, 49])
    expect(selector.props('tagIds')).toEqual([28, 49])
    expect(selector.props('disabled')).toBe(false)

    await confirm(wrapper)

    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({ tagIds: [28, 49], description: expect.stringContaining('#tag-28 #tag-49') }))
    expect(mocks.publish.mock.calls[0][0]).not.toHaveProperty('categoryIds')
  })

  it.each(['', '   '])('blocks publishing with an empty description (%s)', async (description) => {
    const wrapper = mountDialog()
    await showDialog(wrapper)
    wrapper.getComponent(ElFormStub).props('model').description = description
    await confirm(wrapper)
    expect(mocks.publish).not.toHaveBeenCalled()
  })

  it('blocks publishing without tags', async () => {
    const wrapper = mountDialog()
    await showDialog(wrapper)
    wrapper.getComponent(ProductTagSelectorStub).vm.$emit('update:tagIds', [])
    await flushPromises()
    await confirm(wrapper)
    expect(mocks.publish).not.toHaveBeenCalled()
  })

  it('synchronizes changed tags without duplicating the description suffix', async () => {
    const wrapper = mountDialog()
    await showDialog(wrapper)
    wrapper.getComponent(ProductTagSelectorStub).vm.$emit('update:tagIds', [1, 38])
    await flushPromises()
    await confirm(wrapper)
    const description = mocks.publish.mock.calls[0][0].description
    expect(description).toContain('#tag-1 #tag-38')
    expect(description).not.toContain('#tag-28')
    expect(description.split('#tag-1')).toHaveLength(2)
  })

  it('preserves the description on generation failure and permits retry', async () => {
    mocks.generateDescription.mockRejectedValueOnce(new Error('AI unavailable'))
    const wrapper = mountDialog()
    await showDialog(wrapper)
    const original = wrapper.getComponent(ElFormStub).props('model').description
    const button = wrapper.findAll('button').find((button) => button.text() === 'goLive.generateDescription')!
    await button.trigger('click')
    await flushPromises()
    expect(wrapper.getComponent(ElFormStub).props('model').description).toBe(original)
    mocks.generateDescription.mockResolvedValueOnce({ code: 0, data: 'New AI description' })
    await button.trigger('click')
    await flushPromises()
    expect(wrapper.getComponent(ElFormStub).props('model').description).toContain('New AI description')
  })

  it('ignores repeated generation clicks while the request is pending', async () => {
    let resolveRequest!: (value: { code: number; data: string }) => void
    mocks.generateDescription.mockImplementationOnce(() => new Promise((resolve) => { resolveRequest = resolve }))
    const wrapper = mountDialog()
    await showDialog(wrapper)
    const button = wrapper.findAll('button').find((button) => button.text() === 'goLive.generateDescription')!
    await button.trigger('click')
    await button.trigger('click')
    expect(mocks.generateDescription).toHaveBeenCalledTimes(1)
    resolveRequest({ code: 0, data: 'Generated description' })
    await flushPromises()
  })

  it.each(['edit', 'reopen', 'payment'])('does not overwrite newer description state after %s', async (action) => {
    let resolveRequest!: (value: { code: number; data: string }) => void
    mocks.generateDescription.mockImplementationOnce(() => new Promise((resolve) => { resolveRequest = resolve }))
    const wrapper = mountDialog()
    await showDialog(wrapper)
    await wrapper.findAll('button').find((button) => button.text() === 'goLive.generateDescription')!.trigger('click')
    await flushPromises()
    if (action === 'reopen') await showDialog(wrapper)
    else if (action === 'payment') wrapper.getComponent(ElFormStub).props('model').paymentMethod = 'garmin'
    else wrapper.getComponent(ElFormStub).props('model').description = 'My manual edit'
    const expected = wrapper.getComponent(ElFormStub).props('model').description
    resolveRequest({ code: 0, data: 'Stale AI description' })
    await flushPromises()
    expect(wrapper.getComponent(ElFormStub).props('model').description).toBe(expected)
  })

  it('rebuilds refreshed server tags from the current selection without duplicates', async () => {
    mocks.generateDescription.mockResolvedValue({ code: 0, data: 'Refreshed body\n\n\\#tag-49 #tag-28\n\n#tag-28 #tag-49' })
    const wrapper = mountDialog()
    await showDialog(wrapper)
    await wrapper.findAll('button').find((button) => button.text() === 'goLive.generateDescription')!.trigger('click')
    await flushPromises()
    await confirm(wrapper)
    expect(mocks.publish.mock.calls[0][0].description).toBe('Refreshed body\n\n#tag-28 #tag-49')
  })

  it.each([
    ['rejected', () => Promise.reject(new Error('network'))],
    ['nonzero', () => Promise.resolve({ code: 9, data: null })],
    ['invalid', () => Promise.resolve({ code: 0, data: { list: null } })]
  ])('keeps the dialog open and blocks publishing when tag loading is %s', async (_name, response) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.getProductTagsPage.mockImplementationOnce(response)
    const wrapper = mountDialog()
    await showDialog(wrapper)

    expect(wrapper.find('.dialog').exists()).toBe(true)
    expect(wrapper.getComponent(ProductTagSelectorStub).props('disabled')).toBe(true)
    expect(ElMessage.error).toHaveBeenCalledWith('productTags.loadFailed')

    await confirm(wrapper)
    expect(mocks.publish).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

const emptyDesign = () => ({ ...structuredClone(design), product: { ...structuredClone(design.product), name: 'tag-1', tags: [] } })

it('opens empty without generating and allows regeneration after clearing', async () => {
  mocks.getProductTagsPage.mockResolvedValue({ code: 0, data: { list: apiTags } })
  mocks.getProductTagGeneration.mockResolvedValue({ code: 0, data: { status: 'ready', canGenerate: true, tags: [] } })
  let resolve!: (value: unknown) => void
  mocks.generateProductTags.mockClear()
  mocks.generateProductTags.mockImplementation(() => new Promise(r => { resolve = r }))
  const wrapper = mountDialog()
  const show = (value: Design) => (wrapper.vm as unknown as { show: (value: Design) => void }).show(value)
  show(emptyDesign())
  await flushPromises()
  const selector = wrapper.getComponent(ProductTagSelectorStub)
  expect(selector.props('tagIds')).toEqual([])
  expect(selector.props('canGenerate')).toBe(true)
  expect(mocks.generateProductTags).not.toHaveBeenCalled()
  selector.vm.$emit('generate')
  selector.vm.$emit('generate')
  await flushPromises()
  expect(mocks.generateProductTags).toHaveBeenCalledTimes(1)
  expect(selector.props('generating')).toBe(true)
  const completed = { status: 'completed', canGenerate: true, tags: [apiTags[0]] }
  resolve({ code: 0, data: completed })
  await flushPromises()
  expect(selector.props('tagIds')).toEqual([1])
  expect(selector.props('canGenerate')).toBe(true)
  mocks.getProductTagGeneration.mockResolvedValue({ code: 0, data: completed })
  show(emptyDesign())
  await flushPromises()
  expect(selector.props('tagIds')).toEqual([1])
  selector.vm.$emit('generate')
  expect(mocks.generateProductTags).toHaveBeenCalledTimes(1)
  selector.vm.$emit('update:tagIds', [])
  await flushPromises()
  selector.vm.$emit('generate')
  await flushPromises()
  expect(mocks.generateProductTags).toHaveBeenCalledTimes(2)
  resolve({ code: 0, data: completed })
  await flushPromises()
  expect(selector.props('tagIds')).toEqual([1])
})

it('reads status after a timeout without retrying the generation request', async () => {
  mocks.getProductTagGeneration.mockResolvedValueOnce({ code: 0, data: { status: 'ready', canGenerate: true, tags: [] } })
    .mockResolvedValue({ code: 0, data: { status: 'processing', canGenerate: false, tags: [] } })
  mocks.generateProductTags.mockReset().mockRejectedValue(new Error('timeout'))
  const wrapper = mountDialog()
  ;(wrapper.vm as unknown as { show: (value: Design) => void }).show(emptyDesign())
  await flushPromises()
  const selector = wrapper.getComponent(ProductTagSelectorStub)
  selector.vm.$emit('generate')
  await flushPromises()
  expect(selector.props('canGenerate')).toBe(false)
  expect(selector.props('generationStatus')).toBe('processing')
  selector.vm.$emit('generate')
  expect(mocks.generateProductTags).toHaveBeenCalledTimes(1)
})

it('ignores an old app response after switching to a different app', async () => {
  mocks.getProductTagGeneration.mockResolvedValue({ code: 0, data: { status: 'ready', canGenerate: true, tags: [] } })
  let resolve!: (value: unknown) => void
  mocks.generateProductTags.mockReset().mockImplementation(() => new Promise(r => { resolve = r }))
  const wrapper = mountDialog()
  const show = (value: Design) => (wrapper.vm as unknown as { show: (value: Design) => void }).show(value)
  show(emptyDesign())
  await flushPromises()
  const selector = wrapper.getComponent(ProductTagSelectorStub)
  selector.vm.$emit('generate')
  await flushPromises()
  const another = emptyDesign()
  another.product.appId = 201
  show(another)
  await flushPromises()
  resolve({ code: 0, data: { status: 'completed', canGenerate: false, tags: [apiTags[0]] } })
  await flushPromises()
  expect(selector.props('tagIds')).toEqual([])
  expect(selector.props('canGenerate')).toBe(true)
})


it.each([4, 5, 6])('confirms text generation only at five credits or more (%s)', async (cost) => {
  mocks.confirmCost.mockReset().mockResolvedValue('confirm')
  mocks.generateProductTags.mockReset().mockResolvedValue({ code: 0, data: { status: 'succeeded', canGenerate: false, tags: [apiTags[0]] } })
  mocks.generateDescription.mockReset().mockResolvedValue({ code: 0, data: 'Generated description' })
  mocks.getProductTagGeneration.mockResolvedValue({ code: 0, data: { status: 'ready', canGenerate: true, tags: [] } })
  const wrapper = mountDialog()
  ;(wrapper.vm as unknown as { show: (value: Design) => void }).show(emptyDesign())
  await flushPromises()
  mocks.getAiPrices.mockResolvedValue({ code: 0, data: { TAGS: cost, DESCRIPTION: cost, BANNER: 10 } })
  wrapper.getComponent(ProductTagSelectorStub).vm.$emit('generate')
  await flushPromises()
  await wrapper.findAll('button').find(button => button.text() === 'goLive.generateDescription')!.trigger('click')
  await flushPromises()
  expect(mocks.confirmCost).toHaveBeenCalledTimes(cost < 5 ? 0 : 2)
  expect(mocks.generateProductTags).toHaveBeenCalledTimes(1)
  expect(mocks.generateDescription).toHaveBeenCalledTimes(1)
})

it('cancels paid text generation without dispatch and lets tags be retried', async () => {
  mocks.confirmCost.mockReset().mockRejectedValue('cancel')
  mocks.generateProductTags.mockReset()
  mocks.generateDescription.mockReset()
  mocks.getProductTagGeneration.mockResolvedValue({ code: 0, data: { status: 'ready', canGenerate: true, tags: [] } })
  const wrapper = mountDialog()
  ;(wrapper.vm as unknown as { show: (value: Design) => void }).show(emptyDesign())
  await flushPromises()
  mocks.getAiPrices.mockResolvedValue({ code: 0, data: { TAGS: 5, DESCRIPTION: 5, BANNER: 10 } })
  const selector = wrapper.getComponent(ProductTagSelectorStub)
  selector.vm.$emit('generate')
  await flushPromises()
  expect(selector.props('canGenerate')).toBe(true)
  await wrapper.findAll('button').find(button => button.text() === 'goLive.generateDescription')!.trigger('click')
  await flushPromises()
  expect(mocks.generateProductTags).not.toHaveBeenCalled()
  expect(mocks.generateDescription).not.toHaveBeenCalled()
})
