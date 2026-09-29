const TRANSACTION_KEY = 'wristo-studio-sso-transaction'
const MAX_AGE_MS = 15 * 60 * 1000
interface LoginTransaction { state: string; verifier: string; createdAt: number }

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function createStudioLoginTransaction() {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)))
  const state = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('')
  const challenge = base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))
  sessionStorage.setItem(TRANSACTION_KEY, JSON.stringify({ state, verifier, createdAt: Date.now() }))
  return { state, challenge }
}

export function consumeStudioLoginTransaction(state: unknown) {
  const stored = sessionStorage.getItem(TRANSACTION_KEY)
  sessionStorage.removeItem(TRANSACTION_KEY)
  if (!stored || typeof state !== 'string') throw new Error('Login session expired. Please sign in again.')
  let transaction: LoginTransaction
  try { transaction = JSON.parse(stored) } catch { throw new Error('Invalid login session. Please sign in again.') }
  if (!state || transaction.state !== state || typeof transaction.verifier !== 'string'
    || !Number.isFinite(transaction.createdAt) || Date.now() - transaction.createdAt > MAX_AGE_MS
    || transaction.createdAt > Date.now()) {
    throw new Error('Invalid or expired login session. Please sign in again.')
  }
  return transaction.verifier
}

export function isValidPendingStudioPath(path?: string | null): path is string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || /[\\\u0000-\u0020]/.test(path)) return false
  let decoded: string
  try { decoded = decodeURIComponent(path) } catch { return false }
  return !decoded.startsWith('//') && !/[\\\u0000-\u0020]/.test(decoded)
    && !decoded.startsWith('/auth/callback') && !decoded.startsWith('/auth/signed-out')
}
