import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { beforeEach, expect, it, vi } from 'vitest'
import { migrateStudioStorage } from './migrateStudioStorage'
import { updateStudioRecord } from './studioStorage'
import { accessProjectDraft, removeSavedProjectDraft } from './localProjectSnapshot'
import { saveConversation, readConversation } from '@/views/design/aiConversationStorage'

const memory = () => {
  const data = new Map<string, string>()
  return { get length() { return data.size }, key: (n: number) => [...data.keys()][n] ?? null, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v) }, removeItem: (k: string) => { data.delete(k) }, clear: () => data.clear() } as Storage
}
beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()) })
const key = 'wristo:studio:design-draft:v1:design:venu3'
const raw = JSON.stringify({ version: 1, savedAt: 1, config: { elements: [{ id: 'unsynced' }] } })
it('migrates all legacy drafts, preserving unsynced contents and only removes committed originals', async () => {
  const storage = memory(); storage.setItem(key, raw)
  await migrateStudioStorage(storage)
  expect(storage.getItem(key)).toBeNull()
  expect((await accessProjectDraft(key, 'read'))?.config.config.elements[0].id).toBe('unsynced')
  await migrateStudioStorage(storage)
  expect((await accessProjectDraft(key, 'read'))?.savedAt).toBe(1)
})
it('leaves original data intact when IndexedDB cannot open', async () => {
  const storage = memory(); storage.setItem(key, raw)
  vi.stubGlobal('indexedDB', { open: () => { throw new DOMException('disabled', 'SecurityError') } })
  await expect(migrateStudioStorage(storage)).rejects.toThrow()
  expect(storage.getItem(key)).toBe(raw)
})
it('preserves newer snapshots and malformed legacy entries', async () => {
  const storage = memory(); storage.setItem(key, raw); storage.setItem(key + ':bad', '{')
  await accessProjectDraft(key, 'write', { savedAt: 2, config: { edited: true }, assets: {}, fonts: [] })
  await migrateStudioStorage(storage)
  expect((await accessProjectDraft(key, 'read'))?.config.edited).toBe(true)
  expect(storage.getItem(key + ':bad')).toBe('{')
  expect((await updateStudioRecord<Array<{ raw: string }>>('legacy', key))?.map(entry => entry.raw)).toEqual([raw])
})
it('never cleans a newer unsynced draft on cloud save completion', async () => {
  await accessProjectDraft(key, 'write', { savedAt: 3, config: {}, assets: {}, fonts: [] })
  expect(await removeSavedProjectDraft(key, 2)).toBe(false)
  expect(await removeSavedProjectDraft(key, 3)).toBe(true)
  expect(await accessProjectDraft(key, 'read')).toBeUndefined()
})
it('atomically rejects stale conversation writers before they can send another paid request', async () => {
  const value = { pending: { id: 'frozen-id' }, turns: [], prompt: '', scope: 'all' as const }
  const results = await Promise.allSettled([saveConversation('chat', value), saveConversation('chat', { ...value, pending: { id: 'other-id' } })])
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
  expect((await readConversation('chat'))?.pending.id).toBe('frozen-id')
})

it('resumes migration after deletion is interrupted without replacing a newer IndexedDB copy', async () => {
  const storage = memory(); storage.setItem(key, raw)
  const remove = vi.spyOn(storage, 'removeItem').mockImplementationOnce(() => { throw new Error('interrupted') })
  await expect(migrateStudioStorage(storage)).rejects.toThrow('interrupted')
  expect(storage.getItem(key)).toBe(raw)
  expect((await accessProjectDraft(key, 'read'))?.savedAt).toBe(1)
  remove.mockRestore()
  await accessProjectDraft(key, 'write', { savedAt: 4, config: { latest: true }, assets: {}, fonts: [] })
  await migrateStudioStorage(storage)
  expect(storage.getItem(key)).toBeNull()
  expect((await accessProjectDraft(key, 'read'))?.config.latest).toBe(true)
  expect((await updateStudioRecord<Array<{ raw: string }>>('legacy', key))?.map(entry => entry.raw)).toEqual([raw])
})
it('preserves equal-length conflicting legacy revisions instead of overwriting the archive', async () => {
  const storage = memory()
  await accessProjectDraft(key, 'write', { savedAt: 4, config: {}, assets: {}, fonts: [] })
  storage.setItem(key, raw); await migrateStudioStorage(storage)
  const other = raw.replace('unsynced', 'changed!')
  storage.setItem(key, other); await migrateStudioStorage(storage)
  expect((await updateStudioRecord<Array<{ raw: string }>>('legacy', key))?.map(entry => entry.raw)).toEqual([raw, other])
})

it('retains legacy data if put succeeds but the transaction aborts before commit', async () => {
  const storage = memory(); storage.setItem(key, raw)
  const original = IDBObjectStore.prototype.put
  const write = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['put']>) {
    const request = original.apply(this, args)
    request.addEventListener('success', () => this.transaction.abort())
    return request
  })
  try { await expect(migrateStudioStorage(storage)).rejects.toThrow(); expect(storage.getItem(key)).toBe(raw) }
  finally { write.mockRestore() }
  await migrateStudioStorage(storage)
  expect((await accessProjectDraft(key, 'read'))?.savedAt).toBe(1)
})
it('does not delete a different revision even with an identical timestamp', async () => {
  await accessProjectDraft(key, 'write', { savedAt: 3, revision: 'new', config: {}, assets: {}, fonts: [] })
  expect(await removeSavedProjectDraft(key, 3, 'old')).toBe(false)
  expect(await removeSavedProjectDraft(key, 3, 'new')).toBe(true)
})
it('preserves existing v1 IndexedDB drafts during schema upgrade', async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('wristo-project-drafts', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('drafts')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const tx = request.result.transaction('drafts', 'readwrite')
      tx.objectStore('drafts').put({ savedAt: 10, config: { original: true }, assets: {}, fonts: [] }, key)
      tx.oncomplete = () => { request.result.close(); resolve() }
    }
  })
  expect((await accessProjectDraft(key, 'read'))?.config.original).toBe(true)
  await saveConversation('new', { turns: [], prompt: '', scope: 'all' })
  expect(await readConversation('new')).toBeDefined()
})

it('archives captured asset bytes when a legacy draft conflicts with an existing draft', async () => {
  const storage = memory()
  const url = URL.createObjectURL(new Blob(['unsynced image']))
  storage.setItem(key, JSON.stringify({ version: 1, savedAt: 1, config: { imageUrl: url } }))
  await accessProjectDraft(key, 'write', { savedAt: 2, config: {}, fonts: [], assets: {} })
  await migrateStudioStorage(storage)
  URL.revokeObjectURL(url)
  const archive = await updateStudioRecord<Array<{ snapshot: any }>>('legacy', key)
  const snapshot = archive![0].snapshot
  expect(await snapshot.assets[snapshot.config.config.imageUrl].text()).toBe('unsynced image')
})
