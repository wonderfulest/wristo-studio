// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import FaceSyncButton from './FaceSyncButton.vue'
import { startProductSync, getProductSync, type ProductSyncJob } from '@/api/products'
vi.mock('@/api/products', () => ({ startProductSync: vi.fn(), getProductSync: vi.fn() }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
const running: ProductSyncJob = { id: 'job', appId: 123, status: 'running', startedAt: 1,
  steps: [{ key: 'downloads', status: 'succeeded', message: null }, { key: 'china', status: 'running', message: null }] }
const response = (data: ProductSyncJob | null) => ({ code: 0, msg: 'success', data })
const wrappers: ReturnType<typeof mount>[] = []
function setup() { const wrapper = mount(FaceSyncButton, { props: { appId: 123 } }); wrappers.push(wrapper); return wrapper }
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); vi.mocked(getProductSync).mockResolvedValue(response(null)) })
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.useRealTimers() })
it('restores a running task and refreshes the page after a partial failure', async () => {
  vi.mocked(getProductSync).mockResolvedValueOnce(response(running)).mockResolvedValueOnce(response({ ...running, status: 'failed',
    steps: [{ key: 'china', status: 'failed', message: 'chinaFailed' }] }))
  const wrapper = setup(); await flushPromises()
  expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  expect(wrapper.text()).toContain('productSync.running')
  vi.advanceTimersByTime(1500); await flushPromises()
  expect(getProductSync).toHaveBeenLastCalledWith(123, 'job')
  expect(wrapper.text()).toContain('productSync.chinaFailed')
  expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
  expect(wrapper.emitted('updated')).toHaveLength(1)
  expect(startProductSync).not.toHaveBeenCalled()
})
it('prevents duplicate clicks and cancels polling after unmount', async () => {
  vi.mocked(startProductSync).mockResolvedValue({ ...response(running), data: running })
  const wrapper = setup(); await flushPromises()
  await wrapper.get('button').trigger('click'); await flushPromises()
  await wrapper.get('button').trigger('click')
  expect(startProductSync).toHaveBeenCalledTimes(1)
  wrapper.unmount(); vi.advanceTimersByTime(5000); await flushPromises()
  expect(getProductSync).toHaveBeenCalledTimes(1)
})
it('offers reconnection after a polling failure without claiming completion', async () => {
  vi.mocked(getProductSync).mockRejectedValue(new Error('offline'))
  const wrapper = setup(); await flushPromises()
  expect(wrapper.text()).toContain('productSync.statusFailed')
  expect(wrapper.emitted('updated')).toBeUndefined()
  expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
})
