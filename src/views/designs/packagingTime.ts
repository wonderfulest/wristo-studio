import type { DesignListTask } from '@/types/api/design'

type Translate = (key: string, params?: Record<string, string | number>) => string
const timestamp = (value: string | number | null | undefined): number | null => {
  if (value == null || value === '') return null
  const parsed = typeof value === 'number' ? value : new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

export function packagingTimeText(task: DesignListTask | undefined, now: number, t: Translate): string {
  if (!task) return ''
  const status = String(task.packagingStatus || '').toLowerCase()
  if (!['init', 'pending', 'processing'].includes(status)) return ''
  const started = timestamp(task.processingStartedAt)
  const running = status === 'processing' || task.rank === 0 || (started != null && !task.processingFinishedAt)
  const estimate = task.timeEstimate
  const duration = estimate?.durationMs
  const format = (ms: number, approximate = false) => {
    if (approximate && ms < 60_000) return t('card.buildUnderMinute')
    if (ms < 60_000) return t('card.buildSeconds', { count: Math.floor(Math.max(0, ms) / 1000) })
    return t('card.buildMinutes', { count: approximate ? Math.ceil(ms / 60_000) : Math.floor(ms / 60_000) })
  }
  if (running) {
    const elapsed = started == null ? null : Math.max(0, now - started)
    const parts: string[] = []
    if (elapsed != null) parts.push(t('card.buildElapsed', { time: format(elapsed) }))
    if (duration != null && Number.isFinite(duration) && duration > 0) {
      if (elapsed == null) parts.push(t('card.buildExpectedDuration', { time: format(duration, true) }))
      else if (elapsed >= duration) parts.push(t('card.buildOverEstimate'))
      else parts.push(t('card.buildRemaining', { time: format(duration - elapsed, true) }))
    }
    return parts.join(' · ')
  }
  // Queue estimates are refreshed by the API, not decremented: paused/offline workers
  // and priority changes can invalidate them. Expire after missed polling cycles.
  if (task.rank != null && task.rank > 0 && estimate && now - estimate.calculatedAt < 30_000
      && now >= estimate.calculatedAt - 5000 && estimate.waitMs != null
      && Number.isFinite(estimate.waitMs) && estimate.waitMs >= 0) {
    return t('card.buildWait', { time: format(estimate.waitMs, true) })
  }
  const created = timestamp(task.createdAt)
  return created == null ? '' : t('card.buildWaitElapsed', { time: format(Math.max(0, now - created)) })
}
