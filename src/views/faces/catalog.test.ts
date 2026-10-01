import { afterEach, describe, expect, it, vi } from 'vitest'
import { faceDetailsUrl, faceDownloadUrl, loadFaces, loadFaceDetail, type PublishedFace } from './catalog'

afterEach(() => {
  vi.unstubAllGlobals()
})
describe('published face catalog', () => {
  it('loads a device-filtered public page without credentials', async () => {
    const page = { list: [], total: 0, pages: 0 }
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => page })
    vi.stubGlobal('fetch', fetch)
    expect(await loadFaces({ keyword: '', device: '42', sort: 'createdAt:desc', page: 2 })).toEqual(page)
    const [url, options] = fetch.mock.calls[0]
    const parsed = new URL(url, 'https://studio.wristo.io')
    expect(parsed.pathname).toBe('/wristo-api/public/products/faces')
    expect(parsed.searchParams.get('device')).toBe('42')
    expect(parsed.searchParams.get('orderBy')).toBe('createdAt:desc')
    expect(parsed.searchParams.get('pageNum')).toBe('2')
    expect(options.credentials).toBe('omit')
  })
  it('unwraps search results and preserves special characters', async () => {
    const page = { list: [], total: 0, pages: 0 }
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 0, data: page }) })
    vi.stubGlobal('fetch', fetch)
    expect(await loadFaces({ keyword: '  A&B  ', device: '', sort: 'download:desc', page: 1 })).toEqual(page)
    const parsed = new URL(fetch.mock.calls[0][0], 'https://studio.wristo.io')
    expect(parsed.pathname).toBe('/wristo-api/public/products/faces')
    expect(parsed.searchParams.get('keyword')).toBe('A&B')
  })
  it('reports unauthenticated API errors without redirecting', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 401 }) }))
    await expect(loadFaces({ keyword: '', device: '', sort: 'download:desc', page: 1 })).rejects.toThrow('catalog is unavailable')
  })
  it('opens local details and only accepts Connect IQ download links', () => {
    const face = { appId: 123, name: 'Face', price: 0 } as PublishedFace
    expect(faceDetailsUrl(123)).toBe('/faces/123')
    expect(faceDownloadUrl({ ...face, garminStoreUrl: 'https://apps.garmin.com/apps/abc' })).toBe('https://apps.garmin.com/apps/abc')
    expect(faceDownloadUrl({ ...face, garminStoreUrl: 'javascript:alert(1)' })).toBeUndefined()
    expect(faceDownloadUrl(face)).toBeUndefined()
  })
  it('loads the selected app and its editor identity from the public detail endpoint', async () => {
    const face = { appId: 123, designId: 'design-123', name: 'Face', devices: [] }
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 0, data: face }) })
    vi.stubGlobal('fetch', fetch)
    expect(await loadFaceDetail('123')).toEqual(face)
    const [url, options] = fetch.mock.calls[0]
    expect(new URL(url, 'http://localhost').pathname).toBe('/wristo-api/public/products/app/123')
    expect(options.credentials).toBe('omit')
  })
  it('does not request an invalid app id and reports missing apps', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 0, data: null }) })
    vi.stubGlobal('fetch', fetch)
    await expect(loadFaceDetail('../design')).rejects.toThrow('not found')
    expect(fetch).not.toHaveBeenCalled()
    await expect(loadFaceDetail('123')).rejects.toThrow('not found')
  })
})
