import { DEFAULT_LOCALE, normalizeLocale, type SupportedLocale } from '@/stores/locale'

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
  const configuredRedirectUri = import.meta.env.VITE_WRISTO_SSO_REDIRECT_URI
  if (configuredRedirectUri) {
    return configuredRedirectUri
  }
  return new URL('/auth/callback', window.location.origin).toString()
}

function getSsoLoginBaseUrl() {
  const configuredLoginUrl = import.meta.env.VITE_WRISTO_SSO_LOGIN_URL
  if (configuredLoginUrl && !configuredLoginUrl.startsWith('/')) {
    return configuredLoginUrl
  }
  if (window.location.hostname.endsWith('wristo.io')) {
    return 'https://sso.wristo.io/login'
  }
  return configuredLoginUrl || '/login'
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

function localizeSsoPath(loginUrl: URL, locale: SsoLocale) {
  const normalizedPath = loginUrl.pathname.replace(/\/$/, '') || '/login'
  const existingLocalePattern = new RegExp(`^/(${SSO_SUPPORTED_LOCALES.join('|')})(?=/|$)`)
  const pathWithoutLocale = normalizedPath.replace(existingLocalePattern, '') || '/login'
  loginUrl.pathname = `/${locale}${pathWithoutLocale.startsWith('/') ? pathWithoutLocale : `/${pathWithoutLocale}`}`
}

export function buildSsoLoginUrl(client: string, options: RedirectToSsoLoginOptions = {}) {
  const loginUrl = new URL(getSsoLoginBaseUrl(), window.location.origin)
  const ssoLocale = toSsoLocale(getCurrentLocale())
  syncSsoLocale(ssoLocale)
  localizeSsoPath(loginUrl, ssoLocale)
  loginUrl.searchParams.set('client', client)
  loginUrl.searchParams.set('redirect_uri', getSsoRedirectUri())
  if (options.forceLogin) {
    loginUrl.searchParams.set('force_login', '1')
  }
  return loginUrl.toString()
}

export function getPendingStudioPath() {
  return sessionStorage.getItem(PENDING_STUDIO_PATH_KEY)
}

export function clearPendingStudioPath() {
  sessionStorage.removeItem(PENDING_STUDIO_PATH_KEY)
}

function rememberPendingStudioPath(path?: string) {
  if (
    !path
    || !path.startsWith('/')
    || path.startsWith('/auth/callback')
    || path.startsWith('/auth/signed-out')
  ) return
  sessionStorage.setItem(PENDING_STUDIO_PATH_KEY, path)
}

export function redirectToSsoLogin(
  client: string,
  delay = 0,
  pendingPath?: string,
  options: RedirectToSsoLoginOptions = {},
) {
  if (isRedirectingToSso) {
    return
  }
  isRedirectingToSso = true

  rememberPendingStudioPath(pendingPath || `${window.location.pathname}${window.location.search}${window.location.hash}`)
  clearLocalAuthState()

  ssoRedirectTimer = window.setTimeout(() => {
    ssoRedirectTimer = null
    if (window.location.pathname === '/auth/signed-out' && !options.allowFromSignedOut) {
      isRedirectingToSso = false
      return
    }
    window.location.href = buildSsoLoginUrl(client, options)
  }, delay)
}
