import { beforeEach, describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ userInfo: null as { id: number } | null, token: 'jwt' }))
let identityChanged: () => void
vi.mock('@/stores/user', () => ({ useUserStore: () => state }))
vi.mock('vue', () => ({ watch: (_: unknown, callback: () => void) => { identityChanged = callback; callback() } }))
import { installUserActivity } from './userActivity'
const handlers = new Map<string, (event?: unknown) => void>()
let visibility = 'visible'
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-13T15:59:00Z'))
  handlers.clear(); visibility = 'visible'; state.userInfo = null
  vi.stubGlobal('document', { get visibilityState() { return visibility }, addEventListener: (name: string, fn: () => void) => handlers.set(name, fn) })
  vi.stubGlobal('window', { addEventListener: (name: string, fn: () => void) => handlers.set(name, fn) })
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 0, data: true }) }))
})
describe('foreground daily activity', () => {
  it('excludes anonymous/background and reports login while already visible', async () => {
    installUserActivity(); await flush(); expect(fetch).not.toHaveBeenCalled()
    visibility = 'hidden'; state.userInfo = { id: 1 }; identityChanged(); await flush(); expect(fetch).not.toHaveBeenCalled()
    visibility = 'visible'; handlers.get('visibilitychange')!(); await flush(); expect(fetch).toHaveBeenCalledTimes(1)
    expect(JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)).toEqual({ platform: 'studio' })
  })
  it('deduplicates per account/day and counts next Shanghai day only on interaction', async () => {
    state.userInfo = { id: 1 }; installUserActivity(); await flush()
    handlers.get('pointerdown')!({ isTrusted: true }); await flush(); expect(fetch).toHaveBeenCalledTimes(1)
    state.userInfo = { id: 2 }; identityChanged(); await flush(); expect(fetch).toHaveBeenCalledTimes(2)
    vi.setSystemTime(new Date('2026-11-13T16:01:00Z')); await flush(); expect(fetch).toHaveBeenCalledTimes(2)
    handlers.get('pointerdown')!({ isTrusted: false }); await flush(); expect(fetch).toHaveBeenCalledTimes(2)
    handlers.get('pointerdown')!({ isTrusted: true }); await flush(); expect(fetch).toHaveBeenCalledTimes(3)
  })
  it('silently retries failure only after throttle and fresh foreground activity', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'))
    state.userInfo = { id: 1 }; installUserActivity(); await flush()
    handlers.get('keydown')!({ isTrusted: true }); await flush(); expect(fetch).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(31000); await flush(); expect(fetch).toHaveBeenCalledTimes(1)
    handlers.get('keydown')!({ isTrusted: true }); await flush(); expect(fetch).toHaveBeenCalledTimes(2)
  })
})
