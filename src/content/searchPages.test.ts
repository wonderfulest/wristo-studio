import { describe, expect, it } from 'vitest'
import { renderSearchPage, searchPages, studioOrigin } from './searchPages'
import { requiresStudioLogin } from '@/auth/studioAccess'

describe('static search content and authenticated Studio entry', () => {
  it.each(searchPages)('$path renders useful HTML without bypassing Studio login', page => {
    // Static SEO content is generated without a session; opening the SPA still requires login.
    expect(requiresStudioLogin(page.path)).toBe(true)
    const html = renderSearchPage(page)
    expect(html).toContain('<h1>')
    expect(html).toContain('href="/create-watch-face"')
    expect(html).toContain(page.sections[0].heading)
  })
  it('does not open private paths through the guides prefix', () => {
    expect(requiresStudioLogin('/guides/private')).toBe(true)
    expect(requiresStudioLogin('/designs/private')).toBe(true)
  })
  it('escapes editorial text and keeps region-specific origins', () => {
    const html = renderSearchPage({ ...searchPages[0], heading: '<script>alert(1)</script>' })
    expect(html).not.toContain('<script>')
    expect(studioOrigin('http://127.0.0.1:3004')).toBe('https://studio.wristo.io')
    expect(studioOrigin('https://studio.wristo.cn/')).toBe('https://studio.wristo.cn')
  })
})
