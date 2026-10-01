import { describe, expect, it } from 'vitest'
import { buildFaceShareLinks, faceShareUrl, socialCaption, socialImages, facebookShareDialogUrl } from './sharing'

describe('watch face social sharing', () => {
  it('encodes titles and shares the detail URL without leaking query parameters', () => {
    const url = faceShareUrl('https://studio.wristo.io/faces?token=private#image', 123)
    expect(url).toBe('https://studio.wristo.io/faces/123')
    const title = 'Sun & Moon / 星辰 #1'
    const links = buildFaceShareLinks(url, title)
    expect(links.map(link => link.label)).toEqual(['X', 'Facebook', 'Reddit'])
    const [x, facebook, reddit] = links.map(link => new URL(link.href))
    expect(x.searchParams.get('url')).toBe(url)
    expect(x.searchParams.get('text')).toBe(title)
    expect(facebook.searchParams.get('u')).toBe(url)
    expect(reddit.searchParams.get('url')).toBe(url)
    expect(reddit.searchParams.get('title')).toBe(title)
  })
})

describe('Facebook share preparation', () => {
  it('uses verified fields and a public URL, without inventing discounts', () => {
    const caption = socialCaption({ appId: 176566, name: 'Shadow', price: 3.99, dataFieldCatalog: { dataOptions: { ':FIELD_TYPE_STEPS': { label: 'Steps' } } } })
    expect(caption).toContain('Shadow')
    expect(caption).toContain('Steps')
    expect(caption).toContain('https://studio.wristo.io/faces/176566')
    expect(caption).not.toMatch(/SALE|discount|localhost/)
  })
  it('prefers active promotional originals and excludes unsafe image URLs', () => {
    const items = socialImages({ appId: 1, name: 'Face', price: 0, productImages: [
      { id: 1, type: 'product', imageUrl: 'https://cdn.wristo.io/raw.png' },
      { id: 2, type: 'social', imageUrl: 'https://cdn.wristo.io/poster.png' },
      { id: 3, type: 'social', imageUrl: 'https://cdn.wristo.io/hidden.png', isActive: 0 },
      { id: 4, type: 'social', imageUrl: 'javascript:alert(1)' },
    ] })
    expect(items.map(item => item.url)).toEqual(['https://cdn.wristo.io/poster.png', 'https://cdn.wristo.io/raw.png'])
  })
  it('shares a crawler-readable page without trying to prefill the post body', () => {
    const url = new URL(facebookShareDialogUrl(176566))
    expect(url.searchParams.get('u')).toBe('https://api.wristo.io/api/public/share/faces/176566')
    expect(url.searchParams.has('quote')).toBe(false)
  })
})
