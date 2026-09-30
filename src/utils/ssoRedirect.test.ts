import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
vi.mock('@/stores/locale', () => ({ DEFAULT_LOCALE: 'en', normalizeLocale: (value: string) => ['en', 'zh'].includes(value) ? value : 'en' }))
import { buildSsoLoginUrl, cancelPendingSsoRedirect, clearPendingStudioPath, getPendingStudioPath, redirectToSsoLogin } from './ssoRedirect'
import { registerBeforeStudioLogin } from './studioLoginPreparation'
import { consumeStudioLoginTransaction } from './studioPkce'

function storage() {
  const data = new Map<string, string>()
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) }
}
let unregister: (() => void) | undefined
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv('VITE_WRISTO_STUDIO_SSO_REDIRECT_URI', '')
  vi.stubEnv('VITE_WRISTO_STUDIO_SSO_LOGIN_URL', '')
  vi.stubEnv('VITE_WRISTO_SSO_URL', '')
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('sessionStorage', storage())
  vi.stubGlobal('localStorage', storage())
  vi.stubGlobal('document', { cookie: '' })
  vi.stubGlobal('window', {
    location: { origin: 'https://studio.wristo.io', pathname: '/design', search: '?device=166', hash: '#canvas', protocol: 'https:', href: '' },
    setTimeout, clearTimeout,
  })
})
afterEach(() => {
  unregister?.()
  unregister = undefined
  cancelPendingSsoRedirect()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('Studio login redirect', () => {
  it('blocks navigation when the draft cannot be saved', async () => {
    unregister = registerBeforeStudioLogin(async () => { throw new Error('Storage is full') })
    await expect(redirectToSsoLogin('studio')).rejects.toThrow('Storage is full')
    await vi.runAllTimersAsync()
    expect(window.location.href).toBe('')
    expect(getPendingStudioPath()).toBeNull()
  })

  it('waits for draft persistence before scheduling navigation and retains the editor path', async () => {
    let finishSaving!: () => void
    unregister = registerBeforeStudioLogin(() => new Promise<void>((resolve) => { finishSaving = resolve }))
    const redirect = redirectToSsoLogin('studio', 100)
    await vi.runAllTimersAsync()
    expect(window.location.href).toBe('')
    expect(getPendingStudioPath()).toBeNull()
    finishSaving()
    await redirect
    expect(window.location.href).toBe('')
    expect(getPendingStudioPath()).toBe('/design?device=166#canvas')
    await vi.runAllTimersAsync()
    const url = new URL(window.location.href)
    expect(url.origin).toBe('https://sso.wristo.io')
    expect(url.pathname).toBe('/auth')
    expect(url.searchParams.get('client')).toBe('studio')
    expect(url.searchParams.get('redirect_uri')).toBe('https://studio.wristo.io/auth/callback')
    expect(url.searchParams.get('state')).toMatch(/^[a-f0-9]{64}$/)
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    // The callback consumes the PKCE transaction, then separately restores the saved path.
    consumeStudioLoginTransaction(url.searchParams.get('state'))
    expect(getPendingStudioPath()).toBe('/design?device=166#canvas')
    clearPendingStudioPath()
    expect(getPendingStudioPath()).toBeNull()
  })

  it('uses the configured SSO origin', async () => {
    vi.stubEnv('VITE_WRISTO_SSO_URL', 'https://sso.staging.wristo.io/')
    const url = new URL(await buildSsoLoginUrl('studio'))
    expect(url.origin).toBe('https://sso.staging.wristo.io')
    expect(url.pathname).toBe('/auth')
  })

  it('prefers an explicit Studio login URL over the shared SSO origin', async () => {
    vi.stubEnv('VITE_WRISTO_SSO_URL', 'https://sso.wristo.io')
    vi.stubEnv('VITE_WRISTO_STUDIO_SSO_LOGIN_URL', 'https://sso.staging.wristo.io/custom-auth')
    const url = new URL(await buildSsoLoginUrl('studio'))
    expect(url.origin).toBe('https://sso.staging.wristo.io')
    expect(url.pathname).toBe('/custom-auth')
  })

  it('preserves locale and omits unsafe next paths', async () => {
    localStorage.setItem('wristo-studio-locale', 'zh')
    const url = new URL(await buildSsoLoginUrl('studio', {}, '//evil.test'))
    expect(url.searchParams.get('locale')).toBe('zh')
    expect(url.origin).toBe('https://sso.wristo.io')
    expect(url.searchParams.has('next')).toBe(false)
    sessionStorage.setItem('wristo-studio-pending-path', '/\\evil.test')
    expect(getPendingStudioPath()).toBeNull()
  })
})
