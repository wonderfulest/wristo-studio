let isRedirectingToSso = false

export function clearLocalAuthState() {
  localStorage.removeItem('wristo-user')
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
}

export function redirectToSsoLogin(client: string, delay = 0) {
  if (isRedirectingToSso) {
    return
  }
  isRedirectingToSso = true

  clearLocalAuthState()

  const ssoBaseUrl = import.meta.env.VITE_SSO_LOGIN_URL
  const redirectUri = import.meta.env.VITE_SSO_REDIRECT_URI

  window.setTimeout(() => {
    const loginUrl = new URL(ssoBaseUrl, window.location.origin)
    loginUrl.searchParams.set('client', client)
    loginUrl.searchParams.set('redirect_uri', redirectUri)
    window.location.href = loginUrl.toString()
  }, delay)
}
