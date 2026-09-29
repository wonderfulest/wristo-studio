import { expect, it, vi } from 'vitest'
import { prepareLocalProjectPromotion } from './promoteLocalProject'

it('keeps a created shell reusable if recovery persistence fails, and waits for durable recovery', async () => {
  const data = new Map<string, string>()
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
  const create = vi.fn(async () => 'server-123')
  const saveRecovery = vi.fn(async () => { throw new Error('Quota exceeded') })
  await expect(prepareLocalProjectPromotion({ localId: 'local-abc', storage, create, saveRecovery })).rejects.toThrow('Quota exceeded')
  let complete!: () => void
  const durableRecovery = new Promise<void>(resolve => { complete = resolve })
  let promoted = false
  const retry = prepareLocalProjectPromotion({ localId: 'local-abc', storage, create, saveRecovery: () => durableRecovery }).then(id => { promoted = true; return id })
  await Promise.resolve()
  expect(promoted).toBe(false)
  expect(create).toHaveBeenCalledTimes(1)
  complete()
  await expect(retry).resolves.toBe('server-123')
})
