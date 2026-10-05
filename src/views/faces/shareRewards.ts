export interface ShareVisit { token: string | null; minimumVisibleSeconds: number }

/** Counts foreground time only. A server token independently enforces elapsed time and expiry. */
export function trackShareVisit(visit: ShareVisit, confirm: (token: string) => Promise<unknown>): () => void {
  if (!visit.token || visit.minimumVisibleSeconds <= 0) return () => {}
  let remaining = visit.minimumVisibleSeconds * 1000
  let started: number | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let stopped = false
  function stop() {
    stopped = true
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', update)
    window.removeEventListener('pagehide', stop)
  }
  function update() {
    if (stopped) return
    if (started !== null) remaining -= Math.max(0, performance.now() - started)
    started = null
    clearTimeout(timer)
    if (document.visibilityState !== 'visible') return
    if (remaining <= 0) {
      stop()
      void confirm(visit.token!).catch(() => {})
      return
    }
    started = performance.now()
    timer = setTimeout(update, remaining)
  }
  document.addEventListener('visibilitychange', update)
  window.addEventListener('pagehide', stop)
  update()
  return stop
}

/** Background attribution must never show an auth redirect or toast over the public website. */
export async function shareVisitRequest<T>(action: 'visits' | 'confirm', body: unknown, token?: string | null): Promise<T> {
  const response = await fetch(`/wristo-api/public/share-rewards/${action}`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error('Share attribution unavailable')
  const result = await response.json()
  if (result.code !== 0) throw new Error('Share attribution unavailable')
  return result.data as T
}
