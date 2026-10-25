// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DesignManagement from './DesignManagement.vue'
const mocks = vi.hoisted(() => ({
  get: vi.fn(), remove: vi.fn(), transfer: vi.fn(), updateWeight: vi.fn(), update: vi.fn(), push: vi.fn(), publishShow: vi.fn(), submitShow: vi.fn(), error: vi.fn(), refreshUser: vi.fn(), canExport: vi.fn(), canPublish: vi.fn(), download: vi.fn(),
  user: { userInfo: { id: 7, roles: [], device: { deviceId: 'venu3' } }, isAdminUser: false, isStudioConsumer: false, hasFullStudioAccess: true, canCreateDesign: true, studioMembership: { level: 'annual' } },
}))
vi.mock('@/api/wristo/design', () => ({ designApi: { getDesignByUid: mocks.get, deleteDesign: mocks.remove, updateDesign: mocks.update } }))
vi.mock('@/api/wristo/products', () => ({ productsApi: { transferOwner: mocks.transfer, updateStoreWeight: mocks.updateWeight } }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ ...mocks.user, refreshUserInfo: mocks.refreshUser }) }))
vi.mock('@/stores/baseStore', () => ({ useBaseStore: () => ({}) }))
vi.mock('@/stores/message', () => ({ useMessageStore: () => ({ error: mocks.error, success: vi.fn(), warning: vi.fn(), info: vi.fn() }) }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/composables/useStudioMembershipGate', () => ({ useStudioMembershipGate: () => ({ requireExport: mocks.canExport, requirePublish: mocks.canPublish }) }))
vi.mock('@/utils/packageDownload', () => ({ downloadPackageFile: mocks.download }))
vi.mock('@/api/wristo/prg-installer', () => ({ createPrgInstallerTicketCache: () => ({ prepare: vi.fn(), take: vi.fn() }), buildPrgInstallerDeepLink: vi.fn() }))
vi.mock('@/components/dialogs/GoLiveDialog.vue', () => ({ default: { props: ['inline'], setup: (_: unknown, { expose }: any) => { expose({ show: mocks.publishShow }) }, template: '<div class="publish-test" />' } }))
vi.mock('@/components/dialogs/SubmitDesignDialog.vue', () => ({ default: { setup: (_: unknown, { expose }: any) => { expose({ show: mocks.submitShow }) }, template: '<div />' } }))
vi.mock('@/components/common/DeviceDisplay.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/users/DesignerSelect.vue', () => ({ default: { template: '<div />' } }))
vi.mock('./DesignCard.vue', () => ({ default: { name: 'DesignCard', props: ['design'], template: '<div class="card-test" />' } }))
const fixture = () => ({ id: 1, designUid: 'one', name: 'Face', user: { id: 7 }, product: { appId: 211889, id: 10, release: { packageUrl: 'https://example.com/test.iq' } } })
let wrapper: ReturnType<typeof mount> | undefined
let target: HTMLElement
beforeEach(() => { vi.clearAllMocks(); mocks.user.isAdminUser = false; mocks.get.mockResolvedValue({ code: 0, data: fixture() }); mocks.canExport.mockReturnValue(true); mocks.canPublish.mockReturnValue(true); target = document.createElement('div'); document.body.append(target) })
afterEach(() => { wrapper?.unmount(); wrapper = undefined; target.remove(); vi.useRealTimers() })
async function setup() {
  wrapper = mount(DesignManagement, { props: { designUid: 'one', informationTarget: target }, global: { stubs: { ElDialog: true, ElRadioGroup: true, ElRadioButton: true, ElButton: true } } })
  await flushPromises()
  return wrapper
}
describe('application management', () => {
  it('loads the selected device and mounts publishing inline in the information column', async () => {
    await setup()
    expect(mocks.get).toHaveBeenCalledWith('one', { device: 'venu3' })
    expect(target.querySelector('.publish-test')).not.toBeNull()
    expect(mocks.publishShow).toHaveBeenCalledTimes(1)
    await (wrapper!.vm as any).fetchDesigns()
    expect(mocks.publishShow).toHaveBeenCalledTimes(1)
  })
  it('keeps polling when a submitted task is not visible in the first response', async () => {
    vi.useFakeTimers()
    await setup()
    const vm = wrapper!.vm as any
    vm.handleSubmitSuccess({ mode: 'submit' })
    await flushPromises()
    const calls = mocks.get.mock.calls.length
    await vi.advanceTimersByTimeAsync(5000)
    expect(mocks.get).toHaveBeenCalledTimes(calls + 1)
    mocks.get.mockResolvedValue({ code: 0, data: { ...fixture(), product: {
      ...fixture().product, packagingLog: { id: 3, packagingStatus: 'processing' },
    } } })
    await vi.advanceTimersByTimeAsync(60000)
    const processingCalls = mocks.get.mock.calls.length
    await vi.advanceTimersByTimeAsync(5000)
    expect(mocks.get).toHaveBeenCalledTimes(processingCalls + 1)
    mocks.get.mockResolvedValue({ code: 0, data: { ...fixture(), product: {
      ...fixture().product, packagingLog: { id: 3, packagingStatus: 'completed', rank: 0 },
    } } })
    await vi.advanceTimersByTimeAsync(5000)
    const completedCalls = mocks.get.mock.calls.length
    await vi.advanceTimersByTimeAsync(10000)
    expect(mocks.get).toHaveBeenCalledTimes(completedCalls)
  })
  it('does not expose management or publish information to a non-owner', async () => {
    mocks.get.mockResolvedValue({ code: 0, data: { ...fixture(), user: { id: 8 } } })
    await setup()
    expect(wrapper!.find('.card-test').exists()).toBe(false)
    expect(mocks.publishShow).not.toHaveBeenCalled()
  })
  it('allows an administrator to manage another author’s app', async () => {
    mocks.user.isAdminUser = true
    mocks.get.mockResolvedValue({ code: 0, data: { ...fixture(), user: { id: 8 } } })
    await setup()
    expect(wrapper!.find('.card-test').exists()).toBe(true)
  })
  it('keeps the export and publish membership gates', async () => {
    await setup()
    mocks.canExport.mockReturnValue(false)
    mocks.canPublish.mockReturnValue(false)
    await (wrapper!.vm as any).downloadPackage(fixture())
    await (wrapper!.vm as any).buildPrg(fixture())
    await (wrapper!.vm as any).submitDesign(fixture())
    expect(mocks.download).not.toHaveBeenCalled()
    expect(mocks.submitShow).not.toHaveBeenCalled()
  })
  it('prevents deleting a published design and returns to the list after deleting a draft', async () => {
    await setup()
    const vm = wrapper!.vm as any
    vm.confirmDelete({ ...fixture(), product: { ...fixture().product, lastGoLive: 123 } })
    expect(vm.deleteDialogVisible).toBe(false)
    mocks.remove.mockResolvedValue({ code: 0 })
    vm.confirmDelete(fixture())
    await vm.confirmDeleteDesign()
    expect(mocks.remove).toHaveBeenCalledWith('one')
    expect(mocks.push).toHaveBeenCalledWith('/designs')
  })
  it('ignores a response that arrives after leaving the page', async () => {
    let resolve!: (result: unknown) => void
    mocks.get.mockReturnValue(new Promise(done => { resolve = done }))
    await setup()
    wrapper!.unmount(); wrapper = undefined
    resolve({ code: 0, data: fixture() }); await flushPromises()
    expect(mocks.publishShow).not.toHaveBeenCalled()
  })
})
