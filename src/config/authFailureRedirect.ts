interface ForbiddenRequestConfig {
  suppressForbiddenRedirect?: boolean
}

export const forbiddenRedirectPath = (config?: ForbiddenRequestConfig) =>
  config?.suppressForbiddenRedirect ? null : 'https://wristo.io/'
