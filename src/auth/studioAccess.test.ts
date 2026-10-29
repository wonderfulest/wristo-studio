import { describe, expect, it, vi } from 'vitest'
import { guardStudioRoute, canEnterStudio, hasStudioAccess, rejectStudioSession, requiresStudioLogin, hasPremiumEntitlement } from './studioAccess'

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

describe('unified Premium entry', () => {
  const active = { active: true, lifetime: true, expiresAt: null }
  it.each(['ROLE_ADMIN', 'ROLE_MERCHANT'])('allows %s without Premium', roleCode => {
    expect(canEnterStudio({ roles: [{ roleCode }], premium: { ...active, active: false } })).toBe(true)
  })
  it('allows Premium from the API without a subscription or bundle profile', () => {
    expect(hasPremiumEntitlement({ premium: active })).toBe(true)
    expect(canEnterStudio({ premium: active })).toBe(true)
    expect(canEnterStudio({ premium: { ...active, lifetime: false, expiresAt: '2026-11-30T00:00:00Z' } })).toBe(true)
  })
  it('denies missing, expired or revoked rights', () => {
    expect(canEnterStudio(null)).toBe(false)
    expect(canEnterStudio({})).toBe(false)
    expect(canEnterStudio({ premium: { ...active, active: false } })).toBe(false)
  })
  it('does not infer Premium from legacy bundle or subscription fields', () => {
    const user = { premium: { ...active, active: false }, subscription: { planCode: 'lifetime', endTime: null }, userProfile: { hasBundle: 1 } }
    expect(canEnterStudio(user)).toBe(false)
  })
})
