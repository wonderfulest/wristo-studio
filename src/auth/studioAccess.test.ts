import { describe, expect, it, vi } from 'vitest'
import { guardStudioRoute, hasStudioAccess, rejectStudioSession, requiresStudioLogin } from './studioAccess'

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
    const rejectForbidden = vi.fn(() => '/auth/signed-out?reason=forbidden')

    expect(
      guardStudioRoute({
        requiresAuth: true,
        isAuthenticated: true,
        hasAccess: false,
        fullPath: '/designs',
        redirectToLogin,
        rejectForbidden
      })
    ).toBe('/auth/signed-out?reason=forbidden')
    expect(redirectToLogin).not.toHaveBeenCalled()
    expect(rejectForbidden).toHaveBeenCalledOnce()
  })

  it('leaves public routes available without Studio roles', () => {
    expect(
      guardStudioRoute({
        requiresAuth: false,
        isAuthenticated: false,
        hasAccess: false,
        fullPath: '/prg-installer',
        redirectToLogin: vi.fn(),
        rejectForbidden: vi.fn()
      })
    ).toBeUndefined()
  })
})

describe('mandatory Studio login', () => {
  it.each(['/designs/new-projects', '/design', '/designs', '/tokens/private', '/moon', '/prg-installer', '/data-catalog-unavailable'])('requires authentication for %s', (path) => {
    const redirectToLogin = vi.fn()
    expect(requiresStudioLogin(path)).toBe(true)
    expect(guardStudioRoute({ requiresAuth: requiresStudioLogin(path), isAuthenticated: false, hasAccess: true, fullPath: path, redirectToLogin, rejectForbidden: vi.fn() })).toBe(false)
    expect(redirectToLogin).toHaveBeenCalledWith(path)
  })
  it.each(['/', '/tokens', '/tokens/', '/wiki', '/wiki/', '/academy', '/academy/', '/faces', '/faces/', '/faces/123', '/faces/123/', '/auth/callback', '/auth/signed-out'])('keeps %s accessible to avoid login loops', (path) => {
    expect(requiresStudioLogin(path)).toBe(false)
    const redirectToLogin = vi.fn()
    const rejectForbidden = vi.fn()
    expect(guardStudioRoute({ requiresAuth: requiresStudioLogin(path), isAuthenticated: false, hasAccess: false, fullPath: path, redirectToLogin, rejectForbidden })).toBeUndefined()
    expect(redirectToLogin).not.toHaveBeenCalled()
    expect(rejectForbidden).not.toHaveBeenCalled()
  })
})
