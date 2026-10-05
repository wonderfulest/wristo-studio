// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ start: vi.fn(), status: vi.fn(), capabilities: vi.fn(), prices: vi.fn(), balance: vi.fn(), user: null as any }))
vi.mock('@/api/wristo/aiAdjustment', () => ({ aiAdjustmentApi: mocks }))
vi.mock('@/api/wristo/studioAi', () => ({ getAiCapabilities: mocks.capabilities, getAiPrices: mocks.prices }))
vi.mock('@/api/wristo/studioCredits', () => ({ studioCreditsApi: mocks }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.user }))
import AiAdjustmentPanel from './AiAdjustmentPanel.vue'
const wrappers: any[] = []
const result = { summary: 'Larger time', changes: [{ id: 'time', patch: { fontSize: 72 } }] }
const snapshot = { projectId: 'local:test', width: 454, height: 454, fingerprint: 'original', elements: [{ id: 'time', eleType: 'time', fields: { fontSize: 60 }, context: {} }], selectedIds: ['time'] }
const job = (id: string, status = 'running') => ({ id, projectId: 'local:test', status, creditCost: 5, result: status === 'succeeded' ? result : null })
function setup() {
  const applyResult = vi.fn().mockResolvedValue(undefined), capture = vi.fn().mockResolvedValue(snapshot)
  const wrapper = mount(AiAdjustmentPanel, { props: { projectId: 'local:test', selectedCount: 1, capture, applyResult }, global: { stubs: {
    ElButton: { props: ['disabled', 'loading'], template: '<button :disabled="disabled || loading"><slot /></button>' },
  } } })
  wrappers.push(wrapper)
  const button = (name: string) => wrapper.findAll('button').find(b => b.text().startsWith(name))!
  const send = async () => { await flushPromises(); await wrapper.find('textarea').setValue('Make time larger'); await button('Send ·').trigger('click'); await flushPromises() }
  return { wrapper, capture, applyResult, button, send }
}
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); sessionStorage.clear()
  Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: () => 'id-' + Math.random() })
  mocks.user = reactive({ isAuthenticated: true, userInfo: { id: 7 } })
  mocks.capabilities.mockResolvedValue({ data: { WATCHFACE_ADJUST: true } }); mocks.prices.mockResolvedValue({ data: { WATCHFACE_ADJUST: 5 } }); mocks.balance.mockResolvedValue({ data: { balance: 100 } })
  mocks.start.mockImplementation(async id => ({ data: job(id) })); mocks.status.mockImplementation(async id => ({ data: job(id, 'succeeded') }))
})
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.useRealTimers() })
it('shows configured cost and selection; insufficient balance blocks sending', async () => {
  mocks.balance.mockResolvedValue({ data: { balance: 4 } })
  const s = setup(); await flushPromises(); await s.wrapper.find('textarea').setValue('Larger time')
  expect(s.wrapper.text()).toContain('1 selected'); expect(s.button('Send ·').text()).toBe('Send · 5 Credits'); expect(s.button('Send ·').attributes('disabled')).toBeDefined()
})
it('previews before applying and charges only the generation request', async () => {
  const s = setup(); await s.send(); await vi.advanceTimersByTimeAsync(2000); await flushPromises()
  expect(s.applyResult).not.toHaveBeenCalled(); expect(s.wrapper.text()).toContain('Ready to review'); expect(s.wrapper.text()).toContain('60 → 72')
  await s.button('Apply').trigger('click'); await flushPromises()
  expect(s.applyResult).toHaveBeenCalledOnce(); expect(mocks.start).toHaveBeenCalledOnce(); expect(s.wrapper.text()).toContain('Applied · undo')
  await s.send(); expect(mocks.start.mock.calls[1][1].history).toEqual([{ prompt: 'Make time larger', summary: 'Larger time' }])
})
it('uses the same frozen request after ambiguous network failure', async () => {
  mocks.start.mockRejectedValueOnce(Error('network'))
  const s = setup(); await s.send(); const [id, request] = mocks.start.mock.calls[0]
  expect(s.button('Send ·').attributes('disabled')).toBeDefined()
  await s.button('Recover request').trigger('click'); await flushPromises()
  expect(mocks.start.mock.calls[1]).toEqual([id, request])
})
it('restores a pending task across panel remount without generating again', async () => {
  const s = setup(); await s.send(); s.wrapper.unmount()
  const next = setup(); await flushPromises()
  expect(mocks.start).toHaveBeenCalledOnce(); expect(next.wrapper.text()).toContain('Ready to review'); expect(next.applyResult).not.toHaveBeenCalled()
})
it('keeps a stale result unapplied and allows discarding it', async () => {
  const s = setup(); s.applyResult.mockRejectedValue(Error('The design changed.'))
  await s.send(); await vi.advanceTimersByTimeAsync(2000); await flushPromises(); await s.button('Apply').trigger('click'); await flushPromises()
  expect(s.wrapper.text()).toContain('The design changed.'); await s.button('Discard').trigger('click'); await flushPromises()
  expect(s.wrapper.text()).toContain('Not applied'); expect(mocks.start).toHaveBeenCalledOnce()
})
it('shows refunded failure and lets the next request use a new ID', async () => {
  mocks.status.mockImplementation(async id => ({ data: job(id, 'failed') }))
  const s = setup(); await s.send(); await vi.advanceTimersByTimeAsync(2000); await flushPromises()
  expect(s.wrapper.text()).toContain('Any charged credits have been returned'); await s.send()
  expect(mocks.start.mock.calls[1][0]).not.toBe(mocks.start.mock.calls[0][0])
})
it('ignores a late result after switching project or account', async () => {
  let finish!: (value: any) => void
  mocks.start.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const s = setup(); await s.send(); const id = mocks.start.mock.calls[0][0]
  await s.wrapper.setProps({ projectId: 'another-design' }); finish({ data: job(id, 'succeeded') }); await flushPromises()
  expect(s.wrapper.text()).not.toContain('Ready to review'); expect(s.applyResult).not.toHaveBeenCalled()
})
it('refreshes a changed price without a retry loop', async () => {
  mocks.start.mockRejectedValue({ code: 409, msg: 'AI credit price changed' })
  const s = setup(); await s.send()
  expect(s.wrapper.text()).toContain('AI credit price changed'); expect(s.wrapper.text()).not.toContain('Recover request'); expect(mocks.start).toHaveBeenCalledOnce()
})
