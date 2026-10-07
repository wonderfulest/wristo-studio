/** Archive-scoped reads: never retain mutable remote URLs across saves. */
export function createPackageAssetReads(fetcher: (source: string) => Promise<Blob>) {
  const pending = new Map<string, Promise<Blob>>()
  const read = (source: string): Promise<Blob> => {
    let result = pending.get(source)
    if (!result) {
      result = Promise.resolve().then(() => fetcher(source)).catch(error => {
        pending.delete(source)
        throw error
      })
      pending.set(source, result)
    }
    return result
  }
  const prefetch = async (sources: string[]) => {
    const queue = [...new Set(sources)]
    let next = 0
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (next < queue.length) {
        const source = queue[next++]
        // Normal archive assembly records missing assets with their element context.
        try { await read(source) } catch { /* deferred to assembly */ }
      }
    }))
  }
  return { read, prefetch }
}

// Blob contents are immutable; WeakMap entries disappear with the source blob.
const hashes = new WeakMap<Blob, Promise<string>>()
export function hashPackageBlob(blob: Blob): Promise<string> {
  let result = hashes.get(blob)
  if (!result) {
    result = blob.arrayBuffer().then(bytes => crypto.subtle.digest('SHA-256', bytes))
      .then(digest => Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join(''))
      .catch(error => { hashes.delete(blob); throw error })
    hashes.set(blob, result)
  }
  return result
}
