// @vitest-environment jsdom
import { flushPromises as flushVue, mount } from '@vue/test-utils'
import { IDBFactory } from 'fake-indexeddb'
import * as storage from './aiConversationStorage'
import { reactive } from 'vue'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ start: vi.fn(), status: vi.fn(), capabilities: vi.fn(), prices: vi.fn(), balance: vi.fn(), user: null as any }))
vi.mock('@/api/wristo/aiAdjustment', () => ({ aiAdjustmentApi: mocks }))
vi.mock('@/api/wristo/studioAi', () => ({ getAiCapabilities: mocks.capabilities, getAiPrices: mocks.prices }))
vi.mock('@/api/wristo/studioCredits', () => ({ studioCreditsApi: mocks }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.user }))
import AiAdjustmentPanel from './AiAdjustmentPanel.vue'
async function flushPromises() { for (let i = 0; i < 40; i++) await flushVue() }
const wrappers: any[] = []
const result = { summary: 'Larger time', changes: [{ id: 'time', patch: { fontSize: 72 } }] }
const snapshot = { projectId: 'local:test', width: 454, height: 454, fingerprint: 'original', elements: [{ id: 'time', eleType: 'time', fields: { fontSize: 60 }, context: {} }], selectedIds: ['time'] }
const job = (id: string, status = 'running') => ({ id, projectId: 'local:test', status, creditCost: 5, result: status === 'succeeded' ? result : null })
function setup(selectedCount = 1) {
  const applyResult = vi.fn().mockResolvedValue(undefined), capture = vi.fn().mockResolvedValue(snapshot)
  const wrapper = mount(AiAdjustmentPanel, { props: { projectId: 'local:test', selectedCount, capture, applyResult }, global: { stubs: {
    ElButton: { props: ['disabled', 'loading'], template: '<button :disabled="disabled || loading"><slot /></button>' },
  } } })
  wrappers.push(wrapper)
  const button = (name: string) => wrapper.findAll('button').find(b => b.text().startsWith(name))!
  const send = async () => { await flushPromises(); await wrapper.find('textarea').setValue('Make time larger'); await button('Send ·').trigger('click'); await flushPromises() }
  return { wrapper, capture, applyResult, button, send }
}
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal('indexedDB', new IDBFactory()); vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] }); sessionStorage.clear(); localStorage.clear()
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
it('defaults to selected elements when entering with a selection', async () => {
  const s = setup(); await s.send()
  expect(s.capture).toHaveBeenCalledWith('selected')
  expect(mocks.start.mock.calls[0][1].protocolVersion).toBe(3)
})

it('retains draft but defaults to current selection after remount', async () => {
  const s = setup(); await flushPromises()
  await s.wrapper.find('textarea').setValue('My unfinished adjustment')
  await s.wrapper.find('select').setValue('all')
  s.wrapper.unmount(); sessionStorage.clear()
  const next = setup(); await flushPromises()
  expect((next.wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('My unfinished adjustment')
  expect((next.wrapper.find('select').element as HTMLSelectElement).value).toBe('selected')
})
it('retains all history until manually cleared', async () => {
  const turns = Array.from({ length: 25 }, (_, i) => ({ prompt: `Request ${i}`, summary: `Result ${i}`, applied: true }))
  localStorage.setItem('studio-ai-adjust:7:local:test', JSON.stringify({ turns, prompt: 'Draft', scope: 'all' }))
  const s = setup(); await flushPromises()
  expect(s.wrapper.text()).toContain('Request 0')
  await s.button('Clear conversation').trigger('click'); await flushPromises()
  s.wrapper.unmount()
  const next = setup(); await flushPromises()
  expect(next.wrapper.text()).not.toContain('Request 0')
  expect((next.wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('')
})
it('isolates drafts by project and restores them when returning', async () => {
  const s = setup(); await flushPromises()
  await s.wrapper.find('textarea').setValue('First project draft')
  await s.wrapper.setProps({ projectId: 'another-design' }); await flushPromises()
  expect((s.wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('')
  await s.wrapper.find('textarea').setValue('Other draft')
  await s.wrapper.setProps({ projectId: 'local:test' }); await flushPromises()
  expect((s.wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('First project draft')
})

it('accepts successful production results carrying published rule identity', async () => {
  mocks.status.mockImplementation(async id => ({ data: { ...job(id, 'succeeded'), result: { ...result, systemRules: { id: 'wristo-watchface', version: '1.0.0', sha256: 'a'.repeat(64) } } } }))
  const s = setup(); await s.send(); await vi.advanceTimersByTimeAsync(2000); await flushPromises()
  expect(s.wrapper.text()).toContain('Ready to review')
  expect(s.wrapper.text()).not.toContain('Connection interrupted')
  await s.button('Apply').trigger('click'); await flushPromises()
  expect(s.applyResult).toHaveBeenCalledOnce()
})

it('keeps accepted jobs recoverable without persisting the large preview image', async () => {
  const s = setup()
  s.capture.mockResolvedValue({ ...snapshot, referenceImage: 'data:image/png;base64,large-preview' } as any)
  await s.send()
  const saved = (await storage.readConversation('studio-ai-adjust:7:local:test'))!
  expect(saved.pending.id).toBe(mocks.start.mock.calls[0][0])
  expect(saved.pending.request.referenceImage).toBeUndefined()
  s.wrapper.unmount()
  const next = setup(); await flushPromises()
  expect(next.wrapper.text()).toContain('Ready to review')
  expect(mocks.start).toHaveBeenCalledOnce()
})
it('does not charge when the frozen request cannot be saved locally', async () => {
  const s = setup(); await flushPromises()
  const write = vi.spyOn(storage, 'saveConversation').mockImplementation(() => { throw new DOMException('Quota exceeded', 'QuotaExceededError') })
  try {
    await s.send()
    expect(mocks.start).not.toHaveBeenCalled()
    expect(s.wrapper.text()).toContain('Device storage is full')
  } finally { write.mockRestore() }
})

it('previews a name-only change and applies only after explicit Apply', async () => {
  mocks.status.mockImplementation(async id => ({ data: { ...job(id, 'succeeded'), result: { summary: 'Renamed the watch face', changes: [], designName: '童年阳光' } } }))
  const s = setup(0); s.capture.mockResolvedValue({ ...snapshot, selectedIds: [], designName: 'AppbRPxhR' } as any)
  await s.send(); await vi.advanceTimersByTimeAsync(2000); await flushPromises()
  expect(s.wrapper.text()).toContain('AppbRPxhR → 童年阳光')
  expect(s.applyResult).not.toHaveBeenCalled()
  await s.button('Apply').trigger('click'); await flushPromises()
  expect(s.applyResult).toHaveBeenCalledOnce()
})

it('defaults to whole face without selection even if selected scope was saved', async () => {
  localStorage.setItem('studio-ai-adjust:7:local:test', JSON.stringify({ scope: 'selected' }))
  const s = setup(0); await s.send()
  expect(s.capture).toHaveBeenCalledWith('all')
})
it('allows explicitly choosing the whole face while elements are selected', async () => {
  const s = setup(); await flushPromises()
  await s.wrapper.find('select').setValue('all')
  await s.send()
  expect(s.capture).toHaveBeenCalledWith('all')
})

it('recovers the identical frozen request after a network failure and a full panel reload', async () => {
  mocks.start.mockRejectedValueOnce(Error('connection lost after acceptance'))
  const s = setup(); await s.send()
  const original = mocks.start.mock.calls[0]
  s.wrapper.unmount()
  mocks.status.mockRejectedValueOnce(Error('status unavailable'))
  const next = setup(); await flushPromises()
  await next.button('Recover request').trigger('click'); await flushPromises()
  expect(mocks.start.mock.calls[1]).toEqual(original)
})
it('blocks sending when storage cannot be read, rather than forgetting a potentially paid request', async () => {
  const read = vi.spyOn(storage, 'restoreConversation').mockRejectedValue(new DOMException('disabled', 'SecurityError'))
  try {
    const s = setup(); await flushPromises()
    expect(s.button('Send ·').attributes('disabled')).toBeDefined()
    expect(s.wrapper.text()).toContain('Retry local save')
    expect(mocks.start).not.toHaveBeenCalled()
  } finally { read.mockRestore() }
})
it('prevents a stale second panel from submitting a different request for the same conversation', async () => {
  const first = setup(), second = setup(); await flushPromises()
  await first.send(); await second.send()
  expect(mocks.start).toHaveBeenCalledOnce()
  expect(second.wrapper.text()).toContain('another tab')
})
it('can persist a large frozen request even when localStorage writes are full', async () => {
  const s = setup(); await flushPromises()
  s.capture.mockResolvedValue({ ...snapshot, referenceImage: 'data:image/png;base64,' + 'A'.repeat(6_000_000) } as any)
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
  try { await s.send(); expect(mocks.start).toHaveBeenCalledOnce() } finally { write.mockRestore() }
})
it('waits for the frozen request commit before issuing the paid request', async () => {
  const s = setup(); await flushPromises()
  await s.wrapper.find('textarea').setValue('Make time larger'); await flushPromises()
  let commit!: (value: string) => void
  const write = vi.spyOn(storage, 'saveConversation').mockImplementationOnce(() => new Promise<string>(resolve => { commit = resolve }))
  try {
    await s.button('Send ·').trigger('click'); await flushPromises()
    expect(mocks.start).not.toHaveBeenCalled()
    commit('committed'); await flushPromises()
    expect(mocks.start).toHaveBeenCalledOnce()
  } finally { write.mockRestore() }
})
