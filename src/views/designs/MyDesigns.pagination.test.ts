// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ get: vi.fn(), refresh: vi.fn(), error: vi.fn(), user: null as any }))
vi.mock('@/api/wristo/design', () => ({ designApi: { getDesignCards: mocks.get } }))
vi.mock('@/stores/user', async () => {
  const { reactive } = await import('vue')
  mocks.user = reactive({ userInfo: { id: 7, roles: [], device: { deviceId: 'venu3' } }, isAdminUser: true, refreshUserInfo: mocks.refresh })
  return { useUserStore: () => mocks.user }
})
vi.mock('@/stores/message', () => ({ useMessageStore: () => ({ error: mocks.error }) }))
vi.mock('@/utils/errorMessage', () => ({ showErrorOnce: mocks.error }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/components/common/DeviceDisplay.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/users/DesignerSelect.vue', () => ({ default: { name: 'DesignerSelect', template: '<div />' } }))
vi.mock('./DesignCard.vue', () => ({ default: { props: ['design'], template: '<div class="test-card">{{ design.name }}</div>' } }))
import MyDesigns from './MyDesigns.vue'
let wrapper: ReturnType<typeof mount>
let resize: ResizeObserverCallback
let width = 900
const response = (name: string, count = 8) => ({ code: 0, data: { total: 99, list: Array.from({ length: count }, (_, id) => ({ id, name, designUid: `d${id}`, designStatus: 'draft' })) } })
beforeEach(() => {
  vi.clearAllMocks(); width = 900; mocks.user.userInfo.device.deviceId = 'venu3'
  localStorage.clear(); localStorage.setItem('wristo-studio:design-view-mode', 'grid')
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width } as DOMRect))
  vi.stubGlobal('ResizeObserver', class { constructor(cb: ResizeObserverCallback) { resize = cb } observe() {} disconnect() {} })
  mocks.get.mockResolvedValue(response('Face')); mocks.refresh.mockResolvedValue(undefined)
})
afterEach(() => { wrapper?.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })
async function setup() {
  wrapper = mount(MyDesigns, { global: { stubs: {
    Icon: true, RouterLink: true, ElInput: true, ElSelect: true, ElOption: true, ElButton: true, ElSegmented: true, ElSwitch: true,
    ElDialog: true, ElPagination: { name: 'ElPagination', props: ['pageSize', 'currentPage', 'pageSizes'], template: '<div />' },
  } } })
  await flushPromises()
}
describe('My Designs request coordination', () => {
  it('requests exactly two rows once on mount using summary mode', async () => {
    await setup()
    expect(mocks.get).toHaveBeenCalledTimes(1)
    expect(mocks.get).toHaveBeenCalledWith(expect.objectContaining({ pageNum: 1, pageSize: 8, summaryOnly: true, device: 'venu3' }))
    expect(wrapper.findAll('.test-card')).toHaveLength(8)
  })
  it('issues only one request when page size changes on a later page', async () => {
    await setup()
    const pager = wrapper.findComponent({ name: 'ElPagination' })
    pager.vm.$emit('update:currentPage', 3); await flushPromises(); mocks.get.mockClear()
    pager.vm.$emit('update:pageSize', 12); await flushPromises()
    expect(mocks.get).toHaveBeenCalledTimes(1)
    expect(mocks.get).toHaveBeenCalledWith(expect.objectContaining({ pageNum: 1, pageSize: 12 }))
  })
  it('resets a later page and requests once when device or creator changes', async () => {
    await setup()
    const pager = wrapper.findComponent({ name: 'ElPagination' })
    pager.vm.$emit('update:currentPage', 3); await flushPromises(); mocks.get.mockClear()
    mocks.user.userInfo.device.deviceId = 'fenix8'; await flushPromises()
    expect(mocks.get).toHaveBeenCalledTimes(1)
    expect(mocks.get).toHaveBeenLastCalledWith(expect.objectContaining({ pageNum: 1, device: 'fenix8' }))
    pager.vm.$emit('update:currentPage', 3); await flushPromises(); mocks.get.mockClear()
    wrapper.findComponent({ name: 'DesignerSelect' }).vm.$emit('update:modelValue', 42); await flushPromises()
    expect(mocks.get).toHaveBeenCalledTimes(1)
    expect(mocks.get).toHaveBeenLastCalledWith(expect.objectContaining({ pageNum: 1, creatorUserId: 42 }))
  })
  it('does not allow an older request to replace the resized grid', async () => {
    let resolve!: (value: unknown) => void
    mocks.get.mockReturnValueOnce(new Promise(r => { resolve = r }))
    await setup()
    vi.useFakeTimers()
    width = 1200; resize([], {} as ResizeObserver)
    mocks.get.mockResolvedValue(response('New', 10))
    await vi.advanceTimersByTimeAsync(180); await nextTick()
    resolve(response('Old')); await vi.advanceTimersByTimeAsync(0); await nextTick()
    expect(wrapper.findAll('.test-card')).toHaveLength(10)
    expect(wrapper.text()).toContain('New')
    expect(wrapper.text()).not.toContain('Old')
    expect(mocks.get).toHaveBeenCalledTimes(2)
  })
})
