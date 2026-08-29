import { describe, expect, it, vi } from 'vitest'
import { createSunEventsPreviewRefreshQueue } from './sunEvents.previewRefresh'

describe('Sun Events preview refresh queue', () => {
  it('coalesces overlapping refreshes to the latest simulated time', async () => {
    let releaseFirst: (() => void) | undefined
    const firstUpdate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const update = vi.fn()
      .mockReturnValueOnce(firstUpdate)
      .mockResolvedValue(undefined)
    const queue = createSunEventsPreviewRefreshQueue(update)
    const element = { id: 'sun-events' }
    const evening = new Date('2026-07-13T18:00:00.000Z')
    const night = new Date('2026-07-13T22:00:00.000Z')

    queue(element, evening)
    queue(element, night)

    expect(update).toHaveBeenCalledTimes(1)
    releaseFirst?.()
    await firstUpdate
    await Promise.resolve()
    await Promise.resolve()

    expect(update).toHaveBeenNthCalledWith(2, element, { simulatedTime: night })
  })
})
