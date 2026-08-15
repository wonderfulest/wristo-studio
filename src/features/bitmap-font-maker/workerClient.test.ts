import { describe, expect, it, vi } from 'vitest'
import { BitmapFontWorkerClient, WorkerClientError } from './workerClient'
import type { BitmapFontRecipe } from './contracts'

const recipe: BitmapFontRecipe = { schemaVersion: 1, rendererVersion: '1', fontWeight: 400, italicAngle: 0, outlineWidthEm: 0, outlineMode: 'fill', lineJoin: 'round', antialias: true }

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessageerror: ((event: MessageEvent) => void) | null = null
  posts: Array<{ message: unknown; transfer?: Transferable[] }> = []
  terminated = false
  postError: Error | undefined
  postMessage(message: unknown, transfer?: Transferable[]) { if (this.postError) throw this.postError; this.posts.push({ message, transfer }) }
  terminate() { this.terminated = true }
  emit(data: unknown) { this.onmessage?.({ data } as MessageEvent) }
}

describe('BitmapFontWorkerClient', () => {
  it('copies and transfers source bytes, routes progress by requestId, and resolves transferred ZIPs', async () => {
    const worker = new FakeWorker()
    const client = new BitmapFontWorkerClient({ createWorker: () => worker as unknown as Worker, supportsOffscreenCanvas: () => true })
    const source = new Uint8Array([1, 2, 3]).buffer
    const progress = vi.fn()
    const build = client.build({ source, fileName: 'a.ttf', slug: 'a', fontType: 'number_font', recipe }, progress)
    const request = worker.posts[0]
    const requestId = (request.message as { requestId: string }).requestId
    expect(request.transfer).toHaveLength(1)
    expect((request.message as { source: ArrayBuffer }).source).not.toBe(source)
    expect(source.byteLength).toBe(3)
    worker.emit({ type: 'progress', requestId, completed: 1, size: 6, total: 38 })
    worker.emit({ type: 'complete', requestId, zip: new ArrayBuffer(4), manifest: { slug: 'a' } })
    await expect(build.result).resolves.toMatchObject({ zip: expect.any(ArrayBuffer), manifest: { slug: 'a' } })
    expect(progress).toHaveBeenCalledWith({ completed: 1, size: 6, total: 38 })
  })

  it('allows only one active build and accepts a new build after completion', async () => {
    const worker = new FakeWorker()
    const client = new BitmapFontWorkerClient({ createWorker: () => worker as unknown as Worker, supportsOffscreenCanvas: () => true })
    const first = client.build({ source: new ArrayBuffer(1), fileName: 'a.ttf', slug: 'a', fontType: 'number_font', recipe })
    expect(() => client.build({ source: new ArrayBuffer(1), fileName: 'b.ttf', slug: 'b', fontType: 'number_font', recipe })).toThrowError(expect.objectContaining({ code: 'BUILD_IN_PROGRESS' }))
    worker.emit({ type: 'complete', requestId: first.requestId, zip: new ArrayBuffer(2), manifest: { slug: 'a' } })
    await first.result
    const second = client.build({ source: new ArrayBuffer(1), fileName: 'b.ttf', slug: 'b', fontType: 'number_font', recipe })
    worker.emit({ type: 'complete', requestId: second.requestId, zip: new ArrayBuffer(2), manifest: { slug: 'b' } })
    await expect(second.result).resolves.toMatchObject({ manifest: { slug: 'b' } })
  })

  it('cancels by handle and rejects all pending work on dispose', async () => {
    const worker = new FakeWorker()
    const client = new BitmapFontWorkerClient({ createWorker: () => worker as unknown as Worker, supportsOffscreenCanvas: () => true })
    const first = client.build({ source: new ArrayBuffer(1), fileName: 'a.ttf', slug: 'a', fontType: 'number_font', recipe })
    first.cancel()
    expect(worker.posts[1].message).toEqual({ type: 'cancel', requestId: first.requestId })
    worker.emit({ type: 'error', requestId: first.requestId, code: 'BUILD_CANCELLED', message: 'BUILD_CANCELLED' })
    await expect(first.result).rejects.toMatchObject({ code: 'BUILD_CANCELLED' })

    const second = client.build({ source: new ArrayBuffer(1), fileName: 'b.ttf', slug: 'b', fontType: 'number_font', recipe })
    client.dispose()
    expect(worker.terminated).toBe(true)
    await expect(second.result).rejects.toMatchObject({ code: 'WORKER_DISPOSED' })
  })

  it('fails with BROWSER_UNSUPPORTED without a synchronous fallback', () => {
    expect(() => new BitmapFontWorkerClient({ createWorker: () => { throw new Error('must not create') }, supportsOffscreenCanvas: () => false })).toThrowError(
      expect.objectContaining<Partial<WorkerClientError>>({ code: 'BROWSER_UNSUPPORTED' }),
    )
  })

  it.each(['error', 'messageerror'] as const)('enters a unified fatal state on worker %s', async (kind) => {
    const worker = new FakeWorker()
    const client = new BitmapFontWorkerClient({ createWorker: () => worker as unknown as Worker, supportsOffscreenCanvas: () => true })
    const active = client.build({ source: new ArrayBuffer(1), fileName: 'a.ttf', slug: 'a', fontType: 'number_font', recipe })
    if (kind === 'error') worker.onerror?.({} as ErrorEvent)
    else worker.onmessageerror?.({} as MessageEvent)
    await expect(active.result).rejects.toMatchObject({ code: 'WORKER_FAILED' })
    expect(worker.terminated).toBe(true)
    expect(() => client.build({ source: new ArrayBuffer(1), fileName: 'b.ttf', slug: 'b', fontType: 'number_font', recipe })).toThrowError(expect.objectContaining({ code: 'WORKER_FAILED' }))
    expect(() => client.cancel(active.requestId)).toThrowError(expect.objectContaining({ code: 'WORKER_FAILED' }))
    expect(worker.posts).toHaveLength(1)
    client.dispose()
  })

  it('transitions fatal and clears pending work when postMessage throws', async () => {
    const worker = new FakeWorker()
    worker.postError = new Error('clone failed')
    const client = new BitmapFontWorkerClient({ createWorker: () => worker as unknown as Worker, supportsOffscreenCanvas: () => true })
    const active = client.build({ source: new ArrayBuffer(1), fileName: 'a.ttf', slug: 'a', fontType: 'number_font', recipe })
    await expect(active.result).rejects.toMatchObject({ code: 'WORKER_FAILED' })
    expect(worker.terminated).toBe(true)
    expect(() => client.build({ source: new ArrayBuffer(1), fileName: 'b.ttf', slug: 'b', fontType: 'number_font', recipe })).toThrowError(expect.objectContaining({ code: 'WORKER_FAILED' }))
  })
})
