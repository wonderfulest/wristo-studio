import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('Studio conversion identity and delivery', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('document', { cookie: '', referrer: 'https://google.com/search?q=private' })
    vi.stubGlobal('location', { hostname: 'studio.wristo.io', protocol: 'https:', search: '?utm_source=newsletter&email=private' })
    vi.stubGlobal('navigator', { doNotTrack: '0', userAgent: 'Desktop', maxTouchPoints: 0 })
    vi.stubGlobal('innerWidth', 1200)
    vi.stubGlobal('crypto', { randomUUID: () => '12345678-1234-1234-1234-123456789abc' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  })
  afterEach(() => { vi.unstubAllGlobals() })
  it('shares a first-party identity across hosts and strips sensitive URLs', async () => {
    const tracker = await import('./studioConversion')
    expect(tracker.conversionVisitorId()).toBe('12345678-1234-1234-1234-123456789abc')
    expect(document.cookie).toContain('Domain=wristo.io')
    expect(document.cookie).toContain('Secure')
    tracker.trackConversion('studio_enter', 'token')
    tracker.trackConversion('studio_enter', 'token')
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const [, options] = vi.mocked(fetch).mock.calls[0]
    expect(options?.keepalive).toBe(true)
    expect(options?.headers).toMatchObject({ Authorization: 'Bearer token' })
    expect(options?.body).not.toContain('private')
    expect(JSON.parse(String(options?.body)).source).toBe('newsletter')
  })
  it('dispatches an exit click immediately while the visit is still in flight', async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>(() => {}))
    const tracker = await import('./studioConversion')
    tracker.trackConversion('website_visit')
    tracker.trackConversion('studio_click')
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('keeps download identity and deduplication specific to each application', async () => {
    const tracker = await import('./studioConversion')
    tracker.trackConversion('download_start', 'token', 10)
    tracker.trackConversion('download_start', 'token', 10)
    tracker.trackConversion('download_start', 'token', 11)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(vi.mocked(fetch).mock.calls.map(([, options]) => JSON.parse(String(options?.body)).productId)).toEqual([10, 11])
  })
  it('honors do-not-track without storing or reporting', async () => {
    vi.stubGlobal('navigator', { doNotTrack: '1' })
    const tracker = await import('./studioConversion')
    tracker.trackConversion('website_visit')
    expect(document.cookie).toBe('')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('reuses the store cookie across an SSO round trip', async () => {
    document.cookie = 'wristo_conversion_visitor=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const tracker = await import('./studioConversion')
    expect(tracker.conversionVisitorId()).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  })
  it('does not reject user actions when delivery fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'))
    const tracker = await import('./studioConversion')
    expect(() => tracker.trackConversion('studio_enter')).not.toThrow()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce())
  })
})
