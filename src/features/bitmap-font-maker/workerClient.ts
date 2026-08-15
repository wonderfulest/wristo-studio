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
  private terminalError: WorkerClientError | undefined
  private sequence = 0

  constructor(environment: WorkerClientEnvironment = defaultEnvironment) {
    if (!environment.supportsOffscreenCanvas()) throw new WorkerClientError('BROWSER_UNSUPPORTED')
    this.worker = environment.createWorker()
    this.worker.onmessage = (event: MessageEvent<BitmapFontWorkerResponse>) => this.receive(event.data)
    this.worker.onerror = () => this.transitionFatal()
    this.worker.onmessageerror = () => this.transitionFatal()
  }

  build(request: BitmapFontBuildRequest, onProgress?: (progress: BitmapFontBuildProgress) => void): BitmapFontBuildHandle {
    if (this.terminalError) throw this.terminalError
    if (this.disposed) throw new WorkerClientError('WORKER_DISPOSED')
    if (this.pending.size > 0) throw new WorkerClientError('BUILD_IN_PROGRESS')
    const requestId = `bitmap-font-${Date.now()}-${this.sequence += 1}`
    const source = request.source.slice(0)
    let resolve!: PendingBuild['resolve']
    let reject!: PendingBuild['reject']
    const result = new Promise<{ zip: ArrayBuffer; manifest: BitmapFontManifest }>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise
      reject = rejectPromise
    })
    this.pending.set(requestId, { resolve, reject, onProgress })
    try {
      this.worker.postMessage({ type: 'build', requestId, ...request, source }, [source])
    } catch {
      this.transitionFatal()
    }
    return { requestId, result, cancel: () => this.cancel(requestId) }
  }

  cancel(requestId: string): void {
    if (this.terminalError) throw this.terminalError
    if (this.disposed) throw new WorkerClientError('WORKER_DISPOSED')
    if (!this.pending.has(requestId)) return
    try {
      this.worker.postMessage({ type: 'cancel', requestId })
    } catch {
      this.transitionFatal()
    }
  }

  dispose(): void {
    if (this.disposed || this.terminalError) return
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

  private transitionFatal(): void {
    if (this.terminalError || this.disposed) return
    this.terminalError = new WorkerClientError('WORKER_FAILED')
    this.worker.terminate()
    this.failAll(this.terminalError)
  }
}
