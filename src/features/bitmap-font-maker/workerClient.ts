import type { BitmapFontManifest } from './contracts'
import type { BitmapFontBuildProgress, BitmapFontBuildRequest } from './packageBuilder'
import type { BitmapFontWorkerResponse } from './workerProtocol'

export class WorkerClientError extends Error {
  constructor(readonly code: string, message = code, readonly details?: unknown) {
    super(message)
    this.name = 'WorkerClientError'
  }
}

interface WorkerClientEnvironment {
  createWorker(): Worker
  supportsOffscreenCanvas(): boolean
}

interface PendingBuild {
  resolve(value: { zip: ArrayBuffer; manifest: BitmapFontManifest }): void
  reject(error: WorkerClientError): void
  onProgress?: (progress: BitmapFontBuildProgress) => void
}

export interface BitmapFontBuildHandle {
  requestId: string
  result: Promise<{ zip: ArrayBuffer; manifest: BitmapFontManifest }>
  cancel(): void
}

const defaultEnvironment: WorkerClientEnvironment = {
  createWorker: () => new Worker(new URL('./bitmapFont.worker.ts', import.meta.url), { type: 'module' }),
  supportsOffscreenCanvas: () => typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined',
}

export class BitmapFontWorkerClient {
  private readonly worker: Worker
  private readonly pending = new Map<string, PendingBuild>()
  private disposed = false
  private sequence = 0

  constructor(environment: WorkerClientEnvironment = defaultEnvironment) {
    if (!environment.supportsOffscreenCanvas()) throw new WorkerClientError('BROWSER_UNSUPPORTED')
    this.worker = environment.createWorker()
    this.worker.onmessage = (event: MessageEvent<BitmapFontWorkerResponse>) => this.receive(event.data)
    this.worker.onerror = () => this.failAll(new WorkerClientError('WORKER_FAILED'))
  }

  build(request: BitmapFontBuildRequest, onProgress?: (progress: BitmapFontBuildProgress) => void): BitmapFontBuildHandle {
    if (this.disposed) throw new WorkerClientError('WORKER_DISPOSED')
    const requestId = `bitmap-font-${Date.now()}-${this.sequence += 1}`
    const source = request.source.slice(0)
    let resolve!: PendingBuild['resolve']
    let reject!: PendingBuild['reject']
    const result = new Promise<{ zip: ArrayBuffer; manifest: BitmapFontManifest }>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise
      reject = rejectPromise
    })
    this.pending.set(requestId, { resolve, reject, onProgress })
    this.worker.postMessage({ type: 'build', requestId, ...request, source }, [source])
    return { requestId, result, cancel: () => this.cancel(requestId) }
  }

  cancel(requestId: string): void {
    if (!this.pending.has(requestId) || this.disposed) return
    this.worker.postMessage({ type: 'cancel', requestId })
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.worker.terminate()
    this.failAll(new WorkerClientError('WORKER_DISPOSED'))
  }

  private receive(response: BitmapFontWorkerResponse): void {
    const pending = this.pending.get(response.requestId)
    if (!pending) return
    if (response.type === 'progress') {
      pending.onProgress?.({ completed: response.completed, size: response.size, total: response.total })
      return
    }
    this.pending.delete(response.requestId)
    if (response.type === 'complete') pending.resolve({ zip: response.zip, manifest: response.manifest })
    else pending.reject(new WorkerClientError(response.code, response.message, response.details))
  }

  private failAll(error: WorkerClientError): void {
    for (const pending of this.pending.values()) pending.reject(error)
    this.pending.clear()
  }
}
