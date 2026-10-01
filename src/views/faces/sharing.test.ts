import { describe, expect, it } from 'vitest'
import { buildFaceShareLinks, faceShareUrl } from './sharing'

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
