// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { trackShareVisit } from './shareRewards'

describe('share visit visibility confirmation', () => {
  let visibility = 'visible'
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now())
    visibility = 'visible'
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility as DocumentVisibilityState)
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
  it('accumulates only visible time and confirms once', async () => {
    const confirm = vi.fn().mockResolvedValue(undefined)
    const stop = trackShareVisit({ token: 'visit', minimumVisibleSeconds: 10 }, confirm)
    await vi.advanceTimersByTimeAsync(4000)
    visibility = 'hidden'; document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(60000)
    expect(confirm).not.toHaveBeenCalled()
    visibility = 'visible'; document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(6000)
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(confirm).toHaveBeenCalledWith('visit')
    await vi.advanceTimersByTimeAsync(60000)
    expect(confirm).toHaveBeenCalledTimes(1)
    stop()
  })
  it('cancels on navigation and does not confirm disabled visits', async () => {
    const confirm = vi.fn()
    const stop = trackShareVisit({ token: 'visit', minimumVisibleSeconds: 10 }, confirm)
    stop()
    trackShareVisit({ token: null, minimumVisibleSeconds: 0 }, confirm)()
    await vi.advanceTimersByTimeAsync(30000)
    expect(confirm).not.toHaveBeenCalled()
  })
})
