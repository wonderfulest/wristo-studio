import { describe, expect, it, vi } from 'vitest'
import { openRouteInNewTab } from './openRouteInNewTab'

describe('openRouteInNewTab', () => {
  it('uses the router-resolved href and opens it in a safe new tab', () => {
    const router = {
      resolve: vi.fn().mockReturnValue({ href: '/studio/tokens' }),
    }
    const openedWindow = { opener: {} as Window | null }
    const openWindow = vi.fn().mockReturnValue(openedWindow)

    openRouteInNewTab(router, { name: 'Tokens' }, openWindow)

    expect(router.resolve).toHaveBeenCalledWith({ name: 'Tokens' })
    expect(openWindow).toHaveBeenCalledWith('/studio/tokens', '_blank', 'noopener')
    expect(openedWindow.opener).toBeNull()
  })

  it('does not fail when the browser blocks the new tab', () => {
    const router = { resolve: () => ({ href: '/tokens' }) }
    const openWindow = vi.fn().mockReturnValue(null)

    expect(() => openRouteInNewTab(router, { name: 'Tokens' }, openWindow)).not.toThrow()
  })
})
