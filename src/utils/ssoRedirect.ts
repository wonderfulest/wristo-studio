import { DEFAULT_LOCALE, normalizeLocale, type SupportedLocale } from '@/stores/locale'

import { createStudioLoginTransaction, isValidPendingStudioPath } from './studioPkce'
import { prepareStudioLogin } from './studioLoginPreparation'

let isRedirectingToSso = false
let ssoRedirectTimer: number | null = null

const STUDIO_LOCALE_KEY = 'wristo-studio-locale'
const SHARED_LOCALE_KEY = 'wristo-locale'
const PENDING_STUDIO_PATH_KEY = 'wristo-studio-pending-path'
const SSO_SUPPORTED_LOCALES = ['en', 'zh', 'de', 'es', 'fr', 'it'] as const
type SsoLocale = typeof SSO_SUPPORTED_LOCALES[number]
interface RedirectToSsoLoginOptions {
  allowFromSignedOut?: boolean
  forceLogin?: boolean
}

export function clearLocalAuthState() {
  localStorage.removeItem('wristo-user')
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
}

export function cancelPendingSsoRedirect() {
  if (ssoRedirectTimer !== null) {
    window.clearTimeout(ssoRedirectTimer)
    ssoRedirectTimer = null
  }
  isRedirectingToSso = false
}

export function getSsoRedirectUri() {
  return import.meta.env.VITE_WRISTO_STUDIO_SSO_REDIRECT_URI
    || new URL('/auth/callback', window.location.origin).toString()
}

function getSsoLoginBaseUrl() {
  return import.meta.env.VITE_WRISTO_STUDIO_SSO_LOGIN_URL
    || new URL('/auth', import.meta.env.VITE_WRISTO_SSO_URL || 'https://sso.wristo.io').toString()
}

function readLocaleValue(value: string | null): SupportedLocale | null {
  if (!value) return null
  const direct = normalizeLocale(value)
  if (direct !== DEFAULT_LOCALE || value.toLowerCase() === DEFAULT_LOCALE) return direct

  try {
    const parsed = JSON.parse(value) as { currentLocale?: string }
    return normalizeLocale(parsed.currentLocale)
  } catch {
    return null
  }
}

function getCurrentLocale(): SupportedLocale {
  return readLocaleValue(localStorage.getItem(STUDIO_LOCALE_KEY))
    || readLocaleValue(localStorage.getItem(SHARED_LOCALE_KEY))
    || DEFAULT_LOCALE
}

function toSsoLocale(locale: SupportedLocale): SsoLocale {
  if (locale === 'zh-tw') return 'zh'
  return SSO_SUPPORTED_LOCALES.includes(locale as SsoLocale) ? (locale as SsoLocale) : 'en'
}

function syncSsoLocale(locale: SsoLocale) {
  localStorage.setItem(SHARED_LOCALE_KEY, locale)
  const maxAge = 60 * 60 * 24 * 365
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${SHARED_LOCALE_KEY}=${encodeURIComponent(locale)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
}

export async function buildSsoLoginUrl(client: string, options: RedirectToSsoLoginOptions = {}, pendingPath?: string) {
  const loginUrl = new URL(getSsoLoginBaseUrl(), window.location.origin)
  const ssoLocale = toSsoLocale(getCurrentLocale())
  syncSsoLocale(ssoLocale)
  loginUrl.searchParams.set('locale', ssoLocale)
  const { state, challenge } = await createStudioLoginTransaction()
  loginUrl.searchParams.set('state', state)
  loginUrl.searchParams.set('code_challenge', challenge)
  loginUrl.searchParams.set('code_challenge_method', 'S256')
  loginUrl.searchParams.set('client', client)
  loginUrl.searchParams.set('redirect_uri', getSsoRedirectUri())
  if (isValidPendingStudioPath(pendingPath)) {
    loginUrl.searchParams.set('next', pendingPath!)
  }
  if (options.forceLogin) {
    loginUrl.searchParams.set('force_login', '1')
  }
  return loginUrl.toString()
}

export function getPendingStudioPath() {
  const path = sessionStorage.getItem(PENDING_STUDIO_PATH_KEY)
    || localStorage.getItem(PENDING_STUDIO_PATH_KEY)
  return isValidPendingStudioPath(path) ? path : null
}

export function clearPendingStudioPath() {
  sessionStorage.removeItem(PENDING_STUDIO_PATH_KEY)
  localStorage.removeItem(PENDING_STUDIO_PATH_KEY)
}

function rememberPendingStudioPath(path?: string) {
  if (!isValidPendingStudioPath(path)) return
  const pendingPath = path as string
  sessionStorage.setItem(PENDING_STUDIO_PATH_KEY, pendingPath)
  localStorage.setItem(PENDING_STUDIO_PATH_KEY, pendingPath)
}

export async function redirectToSsoLogin(
  client: string,
  delay = 0,
  pendingPath?: string,
  options: RedirectToSsoLoginOptions = {},
) {
  if (isRedirectingToSso) return
  isRedirectingToSso = true
  try {
    await prepareStudioLogin()
    const nextPath = pendingPath || `${window.location.pathname}${window.location.search}${window.location.hash}`
    rememberPendingStudioPath(nextPath)
    const url = await buildSsoLoginUrl(client, options, nextPath)
    if (!isRedirectingToSso) return
    ssoRedirectTimer = window.setTimeout(() => {
      ssoRedirectTimer = null
      if (window.location.pathname === '/auth/signed-out' && !options.allowFromSignedOut) {
        isRedirectingToSso = false
        return
      }
      clearLocalAuthState()
      window.location.href = url
    }, delay)
  } catch (error) {
    cancelPendingSsoRedirect()
    throw error
  }
}
