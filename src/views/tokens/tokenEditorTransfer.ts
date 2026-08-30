import type { AppLanguage } from '@/types/localization'

const STORAGE_PREFIX = 'wristo:token-editor:'

export interface TokenEditorSessionPayload {
  value: string
  appLanguage?: AppLanguage
  allowedVariables?: string[]
}

interface TokenEditorSessionOptions {
  sessionId?: string
  storage?: Storage
  eventTarget?: Window
}

export interface TokenEditorSession {
  id: string
  dispose: () => void
}

const inputStorageKey = (sessionId: string) => `${STORAGE_PREFIX}${sessionId}:input`
export const tokenEditorResultStorageKey = (sessionId: string) => `${STORAGE_PREFIX}${sessionId}:result`

const resolveStorage = (storage?: Storage) => storage || window.localStorage

export function createTokenEditorSession(payload: TokenEditorSessionPayload, onApply: (value: string) => void, options: TokenEditorSessionOptions = {}): TokenEditorSession {
  const storage = resolveStorage(options.storage)
  const eventTarget = options.eventTarget || window
  const id = options.sessionId || crypto.randomUUID()
  const inputKey = inputStorageKey(id)
  const resultKey = tokenEditorResultStorageKey(id)
  let active = true

  const dispose = () => {
    if (!active) return
    active = false
    eventTarget.removeEventListener('storage', handleStorage)
    storage.removeItem(inputKey)
    storage.removeItem(resultKey)
  }
  const handleStorage = (event: StorageEvent) => {
    if (!active || event.key !== resultKey || event.newValue === null) return
    onApply(event.newValue)
    dispose()
  }

  storage.setItem(inputKey, JSON.stringify(payload))
  eventTarget.addEventListener('storage', handleStorage)
  return { id, dispose }
}

export function readTokenEditorSession(sessionId: string, storage: Storage = window.localStorage): TokenEditorSessionPayload | null {
  if (!sessionId) return null
  const serialized = storage.getItem(inputStorageKey(sessionId))
  if (!serialized) return null
  try {
    const payload = JSON.parse(serialized) as Partial<TokenEditorSessionPayload>
    return typeof payload.value === 'string' ? (payload as TokenEditorSessionPayload) : null
  } catch {
    return null
  }
}

export function applyTokenEditorSession(sessionId: string, value: string, storage: Storage = window.localStorage): void {
  if (!sessionId || !storage.getItem(inputStorageKey(sessionId))) return
  storage.setItem(tokenEditorResultStorageKey(sessionId), value)
}
