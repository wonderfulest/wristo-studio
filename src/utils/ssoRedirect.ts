let isRedirectingToSso = false

export function clearLocalAuthState() {
  localStorage.removeItem('wristo-user')
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
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

export function buildSsoLoginUrl(client: string) {
  const loginUrl = new URL(getSsoLoginBaseUrl(), window.location.origin)
  loginUrl.searchParams.set('client', client)
  loginUrl.searchParams.set('redirect_uri', getSsoRedirectUri())
  return loginUrl.toString()
}

export function redirectToSsoLogin(client: string, delay = 0) {
  if (isRedirectingToSso) {
    return
  }
  isRedirectingToSso = true

  clearLocalAuthState()

  window.setTimeout(() => {
    window.location.href = buildSsoLoginUrl(client)
  }, delay)
}
