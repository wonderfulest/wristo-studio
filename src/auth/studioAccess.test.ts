import { describe, expect, it, vi } from 'vitest'
import { guardStudioRoute, hasStudioAccess, rejectStudioSession, requiresStudioLogin, hasWristoMembership, MEMBERSHIP_URL } from './studioAccess'

describe('Studio access policy', () => {
  it.each([
    ['administrator', [{ roleCode: 'ROLE_ADMIN' }]],
    ['merchant', [{ roleCode: 'ROLE_MERCHANT' }]],
    ['multi-role merchant', [{ roleCode: 'ROLE_USER' }, { roleCode: 'ROLE_MERCHANT' }]]
  ])('allows a %s user', (_label, roles) => {
    expect(hasStudioAccess({ roles })).toBe(true)
  })

  it.each([
    ['designer', [{ roleCode: 'ROLE_DESIGNER' }]],
    ['ordinary user', [{ roleCode: 'ROLE_USER' }]],
    ['no roles', []],
    ['missing roles', undefined]
  ])('rejects a user with %s', (_label, roles) => {
    expect(hasStudioAccess({ roles })).toBe(false)
  })

  it('clears every part of a forbidden Studio session', () => {
    const cleanup = {
      cancelPendingRedirect: vi.fn(),
      clearStoreAuth: vi.fn(),
      clearLocalAuth: vi.fn(),
      clearPendingPath: vi.fn()
    }

    expect(rejectStudioSession(cleanup)).toBe('/auth/signed-out?reason=forbidden')
    expect(cleanup.cancelPendingRedirect).toHaveBeenCalledOnce()
    expect(cleanup.clearStoreAuth).toHaveBeenCalledOnce()
    expect(cleanup.clearLocalAuth).toHaveBeenCalledOnce()
    expect(cleanup.clearPendingPath).toHaveBeenCalledOnce()
  })

  it('redirects an authenticated but unauthorized user away from a protected route', () => {
    const redirectToLogin = vi.fn()
    const redirectToMembership = vi.fn()

    expect(
      guardStudioRoute({
        requiresAuth: true,
        isAuthenticated: true,
        hasAccess: false,
        fullPath: '/designs',
        redirectToLogin,
        redirectToMembership
      })
    ).toBe(false)
    expect(redirectToLogin).not.toHaveBeenCalled()
    expect(redirectToMembership).toHaveBeenCalledOnce()
  })

  it('leaves public routes available without Studio roles', () => {
    expect(
      guardStudioRoute({
        requiresAuth: false,
        isAuthenticated: false,
        hasAccess: false,
        fullPath: '/prg-installer',
        redirectToLogin: vi.fn(),
        redirectToMembership: vi.fn()
      })
    ).toBeUndefined()
  })
})

describe('mandatory Studio login', () => {
  it.each(['/designs/new-projects', '/design', '/designs', '/tokens/private', '/moon', '/prg-installer', '/data-catalog-unavailable', '/', '/faces', '/faces/123', '/authors/7', '/wiki', '/academy', '/tokens', '/pricing', '/create-watch-face'])('requires authentication for %s', (path) => {
    const redirectToLogin = vi.fn()
    expect(requiresStudioLogin(path)).toBe(true)
    expect(guardStudioRoute({ requiresAuth: requiresStudioLogin(path), isAuthenticated: false, hasAccess: true, fullPath: path, redirectToLogin, redirectToMembership: vi.fn() })).toBe(false)
    expect(redirectToLogin).toHaveBeenCalledWith(path)
  })
  it.each(['/auth/callback', '/auth/signed-out'])('keeps %s accessible to avoid login loops', (path) => {
    expect(requiresStudioLogin(path)).toBe(false)
    const redirectToLogin = vi.fn()
    const redirectToMembership = vi.fn()
    expect(guardStudioRoute({ requiresAuth: requiresStudioLogin(path), isAuthenticated: false, hasAccess: false, fullPath: path, redirectToLogin, redirectToMembership })).toBeUndefined()
    expect(redirectToLogin).not.toHaveBeenCalled()
    expect(redirectToMembership).not.toHaveBeenCalled()
  })
})

describe('ordinary Wristo membership', () => {
  const now = Date.parse('2026-10-29T00:00:00Z')
  it('uses the ordinary membership checkout', () => {
    expect(MEMBERSHIP_URL).toBe('https://wristo.io/membership')
  })
  it('allows lifetime and unexpired subscriptions', () => {
    expect(hasWristoMembership({ subscription: { planCode: 'lifetime', endTime: null } }, now)).toBe(true)
    expect(hasWristoMembership({ subscription: { endTime: '2026-10-30T00:00:00Z' } }, now)).toBe(true)
  })
  it.each([null, {}, { subscription: {} }, { subscription: { endTime: null } }, { subscription: { endTime: 'invalid' } }, { subscription: { endTime: '2026-10-29T00:00:00Z' } }])('rejects missing or expired membership: %j', user => {
    expect(hasWristoMembership(user, now)).toBe(false)
  })
  it('allows authenticated members through', () => {
    const redirectToMembership = vi.fn()
    expect(guardStudioRoute({ requiresAuth: true, isAuthenticated: true, hasAccess: true, fullPath: '/design', redirectToLogin: vi.fn(), redirectToMembership })).toBeUndefined()
    expect(redirectToMembership).not.toHaveBeenCalled()
  })
})
