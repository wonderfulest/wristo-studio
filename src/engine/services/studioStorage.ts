/** Transactions resolve on commit, not on request success. Never fall back to volatile memory. */
export async function openStudioStorage(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('wristo-project-drafts', 2)
    request.onupgradeneeded = () => {
      for (const name of ['drafts', 'conversations', 'legacy']) {
        if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name)
      }
    }
    request.onerror = () => reject(request.error)
    let blocked = false
    request.onblocked = () => { blocked = true; reject(new Error('Close other Studio tabs and retry saving local data.')) }
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return }
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
  })
}

export async function updateStudioRecord<T>(storeName: string, key: string, update?: (old: T | undefined) => T | undefined): Promise<T | undefined> {
  const db = await openStudioStorage()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, update ? 'readwrite' : 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.get(key)
      let result: T | undefined, failure: unknown
      request.onsuccess = () => {
        try {
          result = update ? update(request.result) : request.result
          if (update) {
            if (result === undefined) store.delete(key)
            else store.put(result, key)
          }
        } catch (error) { failure = error; tx.abort() }
      }
      tx.oncomplete = () => resolve(result)
      tx.onerror = tx.onabort = () => reject(failure || tx.error || new Error('Local storage transaction aborted'))
    })
  } finally { db.close() }
}

export function localStorageError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') return 'Device storage is full. Export unsynced drafts or free disk space, then retry. Your unsynced drafts have not been deleted.'
  return 'Could not save local data. Allow site storage, close other Studio tabs, then retry. Keep this tab open until saving succeeds.'
}
