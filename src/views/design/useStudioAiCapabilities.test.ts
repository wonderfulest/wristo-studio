import { effectScope } from 'vue'
import { describe, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => vi.fn())
vi.mock('@/api/wristo/studioAi', () => ({ getAiCapabilities: api }))
import { useStudioAiCapabilities } from './useStudioAiCapabilities'

describe('editor AI capabilities', () => {
  it('hides entries until loaded and fails closed after an unsuccessful refresh', async () => {
    const scope = effectScope()
    const state = scope.run(() => useStudioAiCapabilities())!
    expect(state.capabilities.value.WATCHFACE).toBe(false)
    api.mockResolvedValueOnce({ code: 0, data: { WATCHFACE: true, WATCHFACE_ADJUST: false } })
    await state.refresh()
    expect(state.capabilities.value.WATCHFACE).toBe(true)
    expect(state.capabilities.value.WATCHFACE_ADJUST).toBe(false)
    api.mockRejectedValueOnce(new Error('offline'))
    await state.refresh()
    expect(state.capabilities.value.WATCHFACE).toBe(false)
    scope.stop()
  })
  it('ignores a stale enabled response after a newer disabled response', async () => {
    const scope = effectScope()
    const state = scope.run(() => useStudioAiCapabilities())!
    let resolve!: (value: unknown) => void
    api.mockImplementationOnce(() => new Promise(r => { resolve = r }))
    const old = state.refresh()
    api.mockResolvedValueOnce({ code: 0, data: { WATCHFACE: false, WATCHFACE_ADJUST: false } })
    await state.refresh()
    resolve({ code: 0, data: { WATCHFACE: true, WATCHFACE_ADJUST: true } })
    await old
    expect(state.capabilities.value.WATCHFACE).toBe(false)
    scope.stop()
  })
})
