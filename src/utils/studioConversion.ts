// First-party browser identity shared by wristo.io and Studio; no email or URL query is collected.
const cookieName = 'wristo_conversion_visitor'
const validId = /^[a-f0-9-]{36}$/
let memoryId = ''
const recent = new Map<string, number>()
export function conversionVisitorId(): string {
  try {
    if (navigator.doNotTrack === '1') return ''
    const cookie = document.cookie.split('; ').find(value => value.startsWith(cookieName + '='))?.split('=')[1]
    if (cookie && validId.test(cookie)) return cookie
    if (!memoryId) memoryId = crypto.randomUUID()
    const shared = location.hostname === 'wristo.io' || location.hostname.endsWith('.wristo.io')
    document.cookie = `${cookieName}=${memoryId}; Path=/; Max-Age=31536000; SameSite=Lax${shared ? '; Domain=wristo.io' : ''}${location.protocol === 'https:' ? '; Secure' : ''}`
    return memoryId
  } catch { return memoryId }
}
export function conversionSource(): string {
  try {
    const campaign = new URLSearchParams(location.search).get('utm_source')
    if (campaign) return campaign.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 120) || 'direct'
    return document.referrer ? new URL(document.referrer).hostname.slice(0, 120) : 'direct'
  } catch { return 'direct' }
}
export function trackConversion(eventType: string, token = '', productId?: number): void {
  const visitorId = conversionVisitorId()
  const key = `${eventType}:${productId || ''}`
  if (!visitorId || Date.now() - (recent.get(key) || 0) < 60000) return
  recent.set(key, Date.now())
  const eventId = crypto.randomUUID()
  const body = JSON.stringify({ eventId, visitorId, eventType, productId, source: conversionSource(),
    device: /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth <= 900) ? 'mobile' : 'desktop' })
  // Start immediately before navigation. A promise queue can strand a click when the page unloads.
  try {
    void fetch('/wristo-api/public/analytics/studio-conversion', {
      method: 'POST', credentials: 'include', keepalive: true,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body,
      signal: AbortSignal.timeout(5000),
    }).then(response => { if (!response.ok) recent.delete(key) })
      .catch(() => { recent.delete(key) })
  } catch { recent.delete(key) }
}
