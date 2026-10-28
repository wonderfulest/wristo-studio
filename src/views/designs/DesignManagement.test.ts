// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DesignManagement from './DesignManagement.vue'
import { reactive, nextTick } from 'vue'
import { ElMessageBox } from 'element-plus'
const mocks = vi.hoisted(() => ({
  prepareTicket: vi.fn(), takeTicket: vi.fn(), copy: vi.fn(), cancelIq: vi.fn(), cancelPrg: vi.fn(), get: vi.fn(), remove: vi.fn(), transfer: vi.fn(), updateWeight: vi.fn(), update: vi.fn(), push: vi.fn(), publishShow: vi.fn(), submitShow: vi.fn(), error: vi.fn(), refreshUser: vi.fn(), canExport: vi.fn(), canPublish: vi.fn(), download: vi.fn(),
  user: { userInfo: { id: 7, roles: [], device: { deviceId: 'venu3' } }, isAdminUser: false, isStudioConsumer: false, hasFullStudioAccess: true, canCreateDesign: true, studioMembership: { level: 'annual' } },
}))
vi.mock('@/api/wristo/design', () => ({ designApi: { createDesignByCopy: mocks.copy, cancelIqPackageTask: mocks.cancelIq, cancelPrgPackageTask: mocks.cancelPrg, getDesignByUid: mocks.get, deleteDesign: mocks.remove, updateDesign: mocks.update } }))
vi.mock('@/api/wristo/products', () => ({ productsApi: { transferOwner: mocks.transfer, updateStoreWeight: mocks.updateWeight } }))
vi.mock('@/stores/user', () => ({ useUserStore: () => reactive({ ...mocks.user, refreshUserInfo: mocks.refreshUser }) }))
vi.mock('@/stores/baseStore', () => ({ useBaseStore: () => ({}) }))
vi.mock('@/stores/message', () => ({ useMessageStore: () => ({ error: mocks.error, success: vi.fn(), warning: vi.fn(), info: vi.fn() }) }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/composables/useStudioMembershipGate', () => ({ useStudioMembershipGate: () => ({ requireExport: mocks.canExport, requirePublish: mocks.canPublish }) }))
vi.mock('@/utils/packageDownload', () => ({ downloadPackageFile: mocks.download }))
vi.mock('@/api/wristo/prg-installer', () => ({ createPrgInstallerTicketCache: () => ({ prepare: mocks.prepareTicket, take: mocks.takeTicket }), buildPrgInstallerDeepLink: vi.fn() }))
vi.mock('@/components/dialogs/PublishForm.vue', () => ({ default: { props: ['inline'], setup: (_: unknown, { expose }: any) => { expose({ show: mocks.publishShow }) }, template: '<div class="publish-test" />' } }))
vi.mock('@/components/dialogs/SubmitDesignDialog.vue', () => ({ default: { setup: (_: unknown, { expose }: any) => { expose({ show: mocks.submitShow }) }, template: '<div />' } }))
vi.mock('@/components/common/DeviceDisplay.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/users/DesignerSelect.vue', () => ({ default: { template: '<div />' } }))
vi.mock('./DesignCard.vue', () => ({ default: { name: 'DesignCard', props: ['design'], template: '<div class="card-test" />' } }))
const fixture = () => ({ id: 1, designUid: 'one', name: 'Face', user: { id: 7 }, product: { appId: 211889, id: 10, release: { packageUrl: 'https://example.com/test.iq' } } })
let wrapper: ReturnType<typeof mount> | undefined
let target: HTMLElement
beforeEach(() => { vi.clearAllMocks(); mocks.user.userInfo.device.deviceId = 'venu3'; mocks.user.isAdminUser = false; mocks.user.isStudioConsumer = false; mocks.get.mockResolvedValue({ code: 0, data: fixture() }); mocks.canExport.mockReturnValue(true); mocks.canPublish.mockReturnValue(true); target = document.createElement('div'); document.body.append(target) })
afterEach(() => { wrapper?.unmount(); wrapper = undefined; target.remove(); vi.useRealTimers(); vi.restoreAllMocks() })
async function setup() {
  wrapper = mount(DesignManagement, { props: { designUid: 'one', informationTarget: target }, global: { stubs: { ElDialog: true, ElRadioGroup: true, ElRadioButton: true, ElButton: true } } })
  await flushPromises()
  return wrapper
}
describe('application management', () => {
  it('rejects simulator preparation and launch for another device', async () => {
    await setup()
    const item = { ...fixture(), product: { ...fixture().product,
      prgRelease: { id: 42, deviceId: 'fenix847mm', prgUrl: 'https://example.com/other.prg' },
    } }
    await (wrapper!.vm as any).preparePreviewPrg(item)
    ;(wrapper!.vm as any).previewPrg(item)
    expect(mocks.prepareTicket).not.toHaveBeenCalled()
    expect(mocks.takeTicket).not.toHaveBeenCalled()
    expect(mocks.download).not.toHaveBeenCalled()
  })

  it('queries each selected device and ignores an older response arriving last', async () => {
    await setup()
    let resolveOld!: (value: unknown) => void
    mocks.get.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    reactive(mocks.user.userInfo).device.deviceId = 'fenix847mm'
    await nextTick()
    expect(mocks.get).toHaveBeenLastCalledWith('one', { device: 'fenix847mm' })
    const latest = { ...fixture(), product: { ...fixture().product,
      prgRelease: { id: 45, deviceId: 'venu3', prgUrl: 'https://example.com/latest.prg' },
    } }
    mocks.get.mockResolvedValueOnce({ code: 0, data: latest })
    reactive(mocks.user.userInfo).device.deviceId = 'venu3'
    await flushPromises()
    resolveOld({ code: 0, data: { ...fixture(), product: { ...fixture().product,
      prgRelease: { id: 44, deviceId: 'fenix847mm', prgUrl: 'https://example.com/stale.prg' },
    } } })
    await flushPromises()
    expect(wrapper!.findComponent({ name: 'DesignCard' }).props('design').product.prgRelease.id).toBe(45)
  })
  it('blocks the old device download while the newly selected device is loading', async () => {
    await setup()
    mocks.get.mockImplementationOnce(() => new Promise(() => {}))
    reactive(mocks.user.userInfo).device.deviceId = 'fenix847mm'
    await nextTick()
    await (wrapper!.vm as any).runPrg({ ...fixture(), product: { ...fixture().product,
      prgRelease: { id: 42, deviceId: 'venu3', prgUrl: 'https://example.com/old.prg' },
    } })
    expect(mocks.download).not.toHaveBeenCalled()
  })

  it.each(['fenix847mm', undefined])('rejects PRG downloads for mismatched or missing device %s', async deviceId => {
    await setup()
    const item = { ...fixture(), product: { ...fixture().product,
      prgRelease: { id: 42, deviceId, prgUrl: 'https://example.com/wrong.prg' },
    } }
    await (wrapper!.vm as any).runPrg(item)
    expect(mocks.download).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledWith('project.prgUnavailable')
  })
  it('downloads a PRG matching the selected device', async () => {
    await setup()
    const item = { ...fixture(), product: { ...fixture().product,
      prgRelease: { id: 42, deviceId: 'venu3', prgUrl: 'https://example.com/venu3.prg' },
    } }
    await (wrapper!.vm as any).runPrg(item)
    expect(mocks.download).toHaveBeenCalledWith('https://example.com/venu3.prg', 'Face', 'prg', 10)
  })

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
    await vi.advanceTimersByTimeAsync(10000)
    expect(mocks.get).toHaveBeenCalledTimes(calls + 1)
    mocks.get.mockResolvedValue({ code: 0, data: { ...fixture(), product: {
      ...fixture().product, packagingLog: { id: 3, packagingStatus: 'processing' },
    } } })
    await vi.advanceTimersByTimeAsync(60000)
    const processingCalls = mocks.get.mock.calls.length
    await vi.advanceTimersByTimeAsync(10000)
    expect(mocks.get).toHaveBeenCalledTimes(processingCalls + 1)
    mocks.get.mockResolvedValue({ code: 0, data: { ...fixture(), product: {
      ...fixture().product, packagingLog: { id: 3, packagingStatus: 'completed', rank: 0 },
    } } })
    await vi.advanceTimersByTimeAsync(10000)
    const completedCalls = mocks.get.mock.calls.length
    await vi.advanceTimersByTimeAsync(10000)
    expect(mocks.get).toHaveBeenCalledTimes(completedCalls)
  })
  it('discovers packaging for a draft without replacing its content', async () => {
    vi.useFakeTimers()
    mocks.get.mockResolvedValue({ code: 0, data: { ...fixture(), product: undefined } })
    await setup()
    mocks.get.mockResolvedValue({ code: 0, data: { ...fixture(), name: 'Remote name', product: {
      ...fixture().product, packagingLog: { id: 3, packagingStatus: 'processing' },
    } } })
    ;(wrapper!.vm as any).handleSubmitSuccess({ mode: 'submit' })
    await flushPromises()
    const design = wrapper!.findComponent({ name: 'DesignCard' }).props('design')
    expect(design.name).toBe('Face')
    expect(design.product.packagingLog.packagingStatus).toBe('processing')
    expect(wrapper!.emitted('updated')).toBeUndefined()
  })
  it('polls every ten seconds without replacing page data or reinitializing publishing', async () => {
    vi.useFakeTimers()
    mocks.get.mockResolvedValue({ code: 0, data: { ...fixture(), product: {
      ...fixture().product, packagingLog: { id: 3, packagingStatus: 'processing' },
    } } })
    await setup()
    const original = wrapper!.findComponent({ name: 'DesignCard' }).props('design')
    mocks.get.mockResolvedValue({ code: 0, data: { ...fixture(), name: 'Changed remotely', product: {
      ...fixture().product, packagingLog: { id: 3, packagingStatus: 'completed' },
      release: { packageUrl: 'https://example.com/new.iq' },
    } } })
    await vi.advanceTimersByTimeAsync(9999)
    expect(mocks.get).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()
    const current = wrapper!.findComponent({ name: 'DesignCard' }).props('design')
    expect(current).toBe(original)
    expect(current.name).toBe('Face')
    expect(current.product.packagingLog.packagingStatus).toBe('completed')
    expect(current.product.release.packageUrl).toBe('https://example.com/new.iq')
    expect(mocks.publishShow).toHaveBeenCalledTimes(1)
    expect(wrapper!.emitted('updated')).toBeUndefined()
    await vi.advanceTimersByTimeAsync(20000)
    expect(mocks.get).toHaveBeenCalledTimes(2)
  })
  it('cancels IQ through its own endpoint and polls until cancellation finishes', async () => {
    vi.useFakeTimers()
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as Awaited<ReturnType<typeof ElMessageBox.confirm>>)
    const task = { ...fixture(), product: { ...fixture().product,
      packagingLog: { id: 31, packagingStatus: 'init', createdAt: 1, rank: 0 },
    } }
    mocks.get.mockResolvedValue({ code: 0, data: task })
    mocks.cancelIq.mockResolvedValue({ code: 0, data: { taskId: 31, status: 'cancel_requested' } })
    await setup()
    mocks.get.mockResolvedValue({ code: 0, data: { ...task, product: { ...task.product,
      packagingLog: { ...task.product.packagingLog, packagingStatus: 'cancel_requested' },
    } } })
    wrapper!.findComponent({ name: 'DesignCard' }).vm.$emit('cancel-iq', task)
    await flushPromises()
    expect(mocks.cancelIq).toHaveBeenCalledWith('one', 31)
    expect(mocks.cancelPrg).not.toHaveBeenCalled()
    const calls = mocks.get.mock.calls.length
    await vi.advanceTimersByTimeAsync(20000)
    expect(mocks.get).toHaveBeenCalledTimes(calls + 2)
    mocks.get.mockResolvedValue({ code: 0, data: { ...task, product: { ...task.product,
      packagingLog: { ...task.product.packagingLog, packagingStatus: 'cancelled', rank: null },
    } } })
    await vi.advanceTimersByTimeAsync(10000)
    const finalCalls = mocks.get.mock.calls.length
    await vi.advanceTimersByTimeAsync(10000)
    expect(mocks.get).toHaveBeenCalledTimes(finalCalls)
  })
  it('does not send an IQ cancellation when confirmation is dismissed', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue('cancel')
    await setup()
    wrapper!.findComponent({ name: 'DesignCard' }).vm.$emit('cancel-iq', {
      ...fixture(), product: { ...fixture().product, packagingLog: { id: 31 } },
    })
    await flushPromises()
    expect(mocks.cancelIq).not.toHaveBeenCalled()
    expect(mocks.error).not.toHaveBeenCalled()
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
  it.each([true, false])('allows an eligible free app to build and download without membership (consumer=%s)', async (consumer) => {
    mocks.user.isStudioConsumer = consumer
    await setup()
    mocks.canExport.mockReturnValue(false)
    mocks.canPublish.mockReturnValue(false)
    const free = { ...fixture(), canInstall: true }
    await (wrapper!.vm as any).buildPrg(free)
    await (wrapper!.vm as any).submitDesign(free)
    await (wrapper!.vm as any).downloadPackage(free)
    expect(mocks.submitShow).toHaveBeenCalledTimes(2)
    expect(mocks.download).toHaveBeenCalledTimes(1)
    expect(mocks.canPublish).not.toHaveBeenCalled()
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

it.each(['eng', 'zhs'])('asks for independent sharing settings when duplicating %s designs', async appLanguage => {
  const source = { ...fixture(), configJson: { localization: { appLanguage } } }
  mocks.get.mockResolvedValue({ code: 0, data: source })
  mocks.copy.mockResolvedValue({ code: 0, data: { ...source, designUid: 'copy' } })
  await setup()
  const vm = wrapper!.vm as any
  await vm.copyDesign(source)
  expect(vm.duplicateLanguageDialogVisible).toBe(true)
  expect(vm.duplicatePubliclyVisible).toBe(true)
  expect(vm.duplicateAllowRemix).toBe(false)
  expect(mocks.copy).not.toHaveBeenCalled()
  vm.duplicatePubliclyVisible = false
  vm.duplicateAllowRemix = true
  await vm.confirmDuplicateLanguage()
  expect(mocks.copy).toHaveBeenCalledWith({ uid: 'one', publiclyVisible: false, allowRemix: true })
  await vm.copyDesign(source)
  expect(vm.duplicatePubliclyVisible).toBe(true)
  expect(vm.duplicateAllowRemix).toBe(false)
})
