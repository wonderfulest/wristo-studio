import { describe, expect, it } from 'vitest'
import { packagingTimeText } from './packagingTime'
import type { DesignListTask } from '@/types/api/design'
const now = 1_000_000
const t = (key: string, params?: Record<string, string | number>) => `${key}${params ? JSON.stringify(params) : ''}`
const running: DesignListTask = { id: 1, createdAt: now - 60_000, packagingStatus: 'pending', rank: 0, processingStartedAt: now - 35_000,
  timeEstimate: { durationMs: 95_000, waitMs: null, calculatedAt: now } }
describe('packaging time text', () => {
  it('shows elapsed and approximate remaining time for a running task', () => {
    const text = packagingTimeText(running, now, t)
    expect(text).toContain('card.buildElapsed')
    expect(text).toContain('35')
    expect(text).toContain('card.buildRemaining')
    expect(text).toContain('card.buildMinutes')
  })
  it('does not turn an overdue build into zero seconds remaining', () => {
    expect(packagingTimeText(running, now + 70_000, t)).toContain('card.buildOverEstimate')
    expect(packagingTimeText(running, now + 70_000, t)).not.toContain('card.buildRemaining')
  })
  it('shows only elapsed time when samples are missing', () => {
    expect(packagingTimeText({ ...running, timeEstimate: undefined }, now, t)).toContain('card.buildElapsed')
    expect(packagingTimeText({ ...running, timeEstimate: undefined }, now, t)).not.toContain('card.buildRemaining')
  })
  it('shows queue wait from the last snapshot without a misleading countdown', () => {
    const task = { ...running, rank: 3, processingStartedAt: null, timeEstimate: { durationMs: 95_000, waitMs: 120_000, calculatedAt: now } }
    expect(packagingTimeText(task, now, t)).toContain('card.buildWait')
    expect(packagingTimeText(task, now + 10_000, t)).toBe(packagingTimeText(task, now, t))
    expect(packagingTimeText({ ...task, timeEstimate: undefined }, now, t)).toContain('card.buildWaitElapsed')
    expect(packagingTimeText(task, now + 60_000, t)).toContain('card.buildWaitElapsed')
  })
  it.each(['complete', 'completed', 'failed', 'cancelled', 'canceled', 'cancel_requested'])('hides timing for %s even with stale rank', status => {
    expect(packagingTimeText({ ...running, packagingStatus: status }, now, t)).toBe('')
  })
  it('handles no start time, invalid timestamps, and newly claimed tasks', () => {
    expect(packagingTimeText({ ...running, processingStartedAt: null }, now, t)).toContain('card.buildExpectedDuration')
    expect(packagingTimeText({ ...running, processingStartedAt: 'bad', timeEstimate: undefined }, now, t)).toBe('')
    expect(packagingTimeText({ ...running, processingStartedAt: now + 5000 }, now, t)).not.toContain('-5')
  })
})
