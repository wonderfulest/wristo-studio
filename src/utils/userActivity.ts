import { watch } from 'vue'
import { useUserStore } from '@/stores/user'

// Only foreground lifecycle and trusted interaction count; API polling never calls this.
export function installUserActivity() {
  const user = useUserStore()
  const identity = () => user.userInfo?.id
  const token = () => user.token
  const completed = new Map<string, string>()
  const attempted = new Map<string, number>()
  const pending = new Set<string>()
  const report = async () => {
    if (document.visibilityState !== 'visible') return
    const id = identity()
    if (!id) return
    const key = String(id)
    const day = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)
    const storageKey = `wristo.activity.studio.${key}`
    let saved: string | null = null
    try { saved = localStorage.getItem(storageKey) } catch { /* Storage is optional. */ }
    if (completed.get(key) === day || saved === day || pending.has(key)) return
    const now = Date.now()
    if (now - (attempted.get(key) || 0) < 30000) return
    attempted.set(key, now)
    pending.add(key)
    try {
      // Deliberately bypass auth/error interceptors: telemetry must never log anyone out.
      const bearer = token()
      const response = await fetch('/wristo-api'.replace(/\/$/, '') + '/user-activity', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
        body: JSON.stringify({ platform: 'studio' }),
        signal: AbortSignal.timeout(10000),
      })
      if (response.ok && (await response.json()).code === 0) {
        completed.set(key, day)
        try { localStorage.setItem(storageKey, day) } catch { /* Keep in-memory dedup. */ }
      }
    } catch { /* Retry on later foreground activity. */ }
    finally { pending.delete(key) }
  }
  const interaction = (event: Event) => { if (event.isTrusted) void report() }
  document.addEventListener('visibilitychange', () => { void report() })
  window.addEventListener('pageshow', () => { void report() })
  for (const event of ['pointerdown', 'keydown', 'touchstart', 'wheel']) {
    window.addEventListener(event, interaction, { passive: true })
  }
  watch(identity, () => { void report() }, { immediate: true })
}
