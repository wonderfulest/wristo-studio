// @vitest-environment jsdom
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getDesignByUid: vi.fn(), updateDesign: vi.fn(),
  route: { path: '/designs', query: {} as Record<string, string> }
}))
vi.mock('@/api/wristo/design', () => ({ designApi: mocks }))
vi.mock('vue-router', () => ({ useRoute: () => mocks.route, useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/stores/baseStore', () => ({ useBaseStore: () => ({ generateConfig: () => ({}) }) }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ isMerchantUser: true, userInfo: { id: 1 } }) }))
vi.mock('@/stores/message', () => ({ useMessageStore: () => ({ error: vi.fn(), success: vi.fn() }) }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@/utils/errorMessage', () => ({ showErrorOnce: vi.fn() }))
vi.mock('@/engine/services/exportService', () => ({ resolvePackageAssetUrls: async (value: unknown) => value }))
vi.mock('@/engine/services/designAssetBundleService', () => ({
  restoreDesignAssetBundle: async (value: unknown) => value, buildWrtDesignPackage: vi.fn()
}))
vi.mock('@/engine/services/saveWrtProject', () => ({ saveWrtProject: vi.fn() }))
vi.mock('@/engine/services/wrtCryptoService', () => ({ encryptWrtFile: vi.fn() }))
vi.mock('@/utils/packageDownload', () => ({ downloadPackageFile: vi.fn() }))
import EditDesignDialog from './EditDesignDialog.vue'

const Slot = defineComponent({ setup(_, { slots }) { return () => h('div', [slots.default?.(), slots.header?.(), slots.footer?.()]) } })
const Button = defineComponent({ setup(_, { slots }) { return () => h('button', slots.default?.()) } })
const show = async (description: string | null = 'product text', hasProduct = true) => {
  mocks.getDesignByUid.mockResolvedValue({ code: 0, data: {
    id: 1, designUid: 'd1', name: 'Face', description: 'legacy text', configJson: {},
    product: hasProduct ? { id: 2, appId: 100, description, payment: { paymentMethod: 'free' } } : null
  } })
  const wrapper = mount(EditDesignDialog, { global: { stubs: {
    ElDialog: Slot, ElButton: Button, ElButtonGroup: Slot, ElIcon: Slot, ElInput: true, ElSelect: Slot,
    ElOption: true, ElRadioGroup: Slot, ElRadio: true, ElInputNumber: true,
    CollapsibleJsonTree: true, CopyGarminDescriptionButton: true
  } } })
  await (wrapper.vm as unknown as { show: (uid: string) => Promise<void> }).show('d1')
  await flushPromises()
  return wrapper
}

describe('EditDesignDialog canonical description', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.route.path = '/designs'; mocks.route.query = {}; mocks.updateDesign.mockResolvedValue({ code: 0 }) })
  it.each([false, true])('shows the product text in canvas mode %s', async (canvas) => {
    if (canvas) { mocks.route.path = '/design'; mocks.route.query = { id: 'd1' } }
    const wrapper = await show()
    expect(wrapper.find('.readonly-description').text()).toBe('product text')
    expect(wrapper.text()).not.toContain('legacy text')
    wrapper.unmount()
  })
  it('does not fall back to legacy text for an empty product description', async () => {
    const wrapper = await show(null)
    expect(wrapper.find('.readonly-description').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('legacy text')
    wrapper.unmount()
  })
  it('keeps the initial text for a draft without a product', async () => {
    const wrapper = await show(null, false)
    expect(wrapper.find('.readonly-description').text()).toBe('legacy text')
    wrapper.unmount()
  })
  it('does not resubmit the readonly description when saving other settings', async () => {
    const wrapper = await show()
    await wrapper.findAll('button').find(button => button.text() === 'common.save')!.trigger('click')
    await flushPromises()
    expect(mocks.updateDesign).toHaveBeenCalledOnce()
    expect(mocks.updateDesign.mock.calls[0][0]).not.toHaveProperty('description')
    wrapper.unmount()
  })
})
