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

export function buildSsoLoginUrl(client: string) {
  const ssoBaseUrl = import.meta.env.VITE_WRISTO_SSO_LOGIN_URL
  const loginUrl = new URL(ssoBaseUrl, window.location.origin)
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
