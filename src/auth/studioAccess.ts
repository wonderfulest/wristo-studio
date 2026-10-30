const STUDIO_ROLE_CODES = new Set(['ROLE_ADMIN', 'ROLE_MERCHANT'])

type StudioUser =
  | {
      roles?: Array<{ roleCode: string }>
      premium?: { active: boolean; lifetime: boolean; expiresAt: string | null } | null
    }
  | null
  | undefined

export type StudioSessionCleanup = {
  cancelPendingRedirect: () => void
  clearStoreAuth: () => void
  clearLocalAuth: () => void
  clearPendingPath: () => void
}

type StudioRouteGuardOptions = {
  requiresAuth: boolean
  isAuthenticated: boolean
  hasAccess: boolean
  fullPath: string
  redirectToLogin: (fullPath: string) => void
  redirectToMembership: () => void
}

export const FORBIDDEN_STUDIO_PATH = '/auth/signed-out?reason=forbidden'

export function hasStudioAccess(user: StudioUser) {
  return user?.roles?.some((role) => STUDIO_ROLE_CODES.has(role.roleCode)) === true
}

export function rejectStudioSession(cleanup: StudioSessionCleanup) {
  cleanup.cancelPendingRedirect()
  cleanup.clearStoreAuth()
  cleanup.clearLocalAuth()
  cleanup.clearPendingPath()
  return FORBIDDEN_STUDIO_PATH
}

export function guardStudioRoute(options: StudioRouteGuardOptions) {
  if (!options.requiresAuth) return undefined

  if (!options.isAuthenticated) {
    options.redirectToLogin(options.fullPath)
    return false
  }

  if (!options.hasAccess) {
    options.redirectToMembership()
    return false
  }

  return undefined
}

export const MEMBERSHIP_URL = 'https://www.wristo.io/membership'

export function hasPremiumEntitlement(user: StudioUser) {
  return user?.premium?.active === true
}

export function canEnterStudio(user: StudioUser) {
  return hasStudioAccess(user) || hasPremiumEntitlement(user)
}

export const requiresStudioLogin = (path: string) => {
  const normalized = path.replace(/\/$/, '') || '/'
  return !['/auth/callback', '/auth/signed-out'].includes(normalized)
}
