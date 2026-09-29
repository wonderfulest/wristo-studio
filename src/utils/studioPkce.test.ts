import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto, createHash } from 'node:crypto'
import { consumeStudioLoginTransaction, createStudioLoginTransaction, isValidPendingStudioPath } from './studioPkce'
import { prepareStudioLogin, registerBeforeStudioLogin } from './studioLoginPreparation'

beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('crypto', webcrypto)
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) })
})
afterEach(() => { vi.unstubAllGlobals() })

describe('Studio login transaction', () => {
  it('binds state to a single-use S256 verifier', async () => {
    const { state, challenge } = await createStudioLoginTransaction()
    expect(state).toMatch(/^[a-f0-9]{64}$/)
    const verifier = consumeStudioLoginTransaction(state)
    expect(challenge).toBe(createHash('sha256').update(verifier).digest('base64url'))
    expect(() => consumeStudioLoginTransaction(state)).toThrow()
  })
  it('rejects a different or missing state', async () => {
    await createStudioLoginTransaction()
    expect(() => consumeStudioLoginTransaction('wrong')).toThrow()
    expect(() => consumeStudioLoginTransaction(undefined)).toThrow()
  })
  it('rejects expired transactions', async () => {
    const { state } = await createStudioLoginTransaction()
    const now = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 16 * 60 * 1000)
    expect(() => consumeStudioLoginTransaction(state)).toThrow()
    now.mockRestore()
  })
  it('rejects external and callback navigation', () => {
    for (const path of ['//evil.test', '/\\evil.test', '/%2f%2fevil.test', '/%5cevil.test', '/auth/callback?code=x', '/auth/signed-out', '/\tevil.test']) expect(isValidPendingStudioPath(path)).toBe(false)
    expect(isValidPendingStudioPath('/design/new?device=166#editor')).toBe(true)
  })
  it('awaits draft saving and propagates failure', async () => {
    const unregister = registerBeforeStudioLogin(async () => { throw new Error('Draft save failed') })
    await expect(prepareStudioLogin()).rejects.toThrow('Draft save failed')
    unregister()
    await expect(prepareStudioLogin()).resolves.toBeUndefined()
  })
})
