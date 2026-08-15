import { describe, expect, it, vi } from 'vitest'
import { BitmapFontWorkerClient, WorkerClientError } from './workerClient'
import type { BitmapFontRecipe } from './contracts'

const recipe: BitmapFontRecipe = { schemaVersion: 1, rendererVersion: '1', fontWeight: 400, italicAngle: 0, outlineWidthEm: 0, outlineMode: 'fill', lineJoin: 'round', antialias: true }

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  posts: Array<{ message: unknown; transfer?: Transferable[] }> = []
  terminated = false
  postMessage(message: unknown, transfer?: Transferable[]) { this.posts.push({ message, transfer }) }
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

  it('isolates requests and ignores late messages', async () => {
    const worker = new FakeWorker()
    const client = new BitmapFontWorkerClient({ createWorker: () => worker as unknown as Worker, supportsOffscreenCanvas: () => true })
    const first = client.build({ source: new ArrayBuffer(1), fileName: 'a.ttf', slug: 'a', fontType: 'number_font', recipe })
    const second = client.build({ source: new ArrayBuffer(1), fileName: 'b.ttf', slug: 'b', fontType: 'number_font', recipe })
    const [firstId, secondId] = worker.posts.map(({ message }) => (message as { requestId: string }).requestId)
    worker.emit({ type: 'complete', requestId: secondId, zip: new ArrayBuffer(2), manifest: { slug: 'b' } })
    worker.emit({ type: 'complete', requestId: secondId, zip: new ArrayBuffer(99), manifest: { slug: 'late' } })
    worker.emit({ type: 'error', requestId: firstId, code: 'FAILED', message: 'safe', details: { size: 6 } })
    await expect(first.result).rejects.toMatchObject({ code: 'FAILED', message: 'safe', details: { size: 6 } })
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
})
