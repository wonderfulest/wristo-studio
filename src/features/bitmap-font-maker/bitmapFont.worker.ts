/// <reference lib="webworker" />
import { buildBitmapFontPackage, BuildCancelledError } from './packageBuilder'
import type { BitmapFontWorkerRequest, BitmapFontWorkerResponse } from './workerProtocol'

type BuildPackage = typeof buildBitmapFontPackage
type PostResponse = (response: BitmapFontWorkerResponse, transfer: Transferable[]) => void

export interface BitmapFontWorkerHandlerDependencies {
  build: BuildPackage
  post: PostResponse
}

export function sanitizeWorkerErrorDetails(error: unknown): Record<string, string | number | boolean> | undefined {
  if (!error || typeof error !== 'object') return undefined
  const details: Record<string, string | number | boolean> = {}
  for (const key of ['codepoint', 'size'] as const) {
    const value = (error as Record<string, unknown>)[key]
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') details[key] = value
  }
  return Object.keys(details).length ? details : undefined
}

export function createBitmapFontWorkerHandler(
  dependencies: BitmapFontWorkerHandlerDependencies,
): (event: MessageEvent<BitmapFontWorkerRequest>) => Promise<void> {
  const cancelled = new Set<string>()
  let activeRequestId: string | undefined
  return async (event) => {
    const request = event.data
    if (request.type === 'cancel') {
      if (activeRequestId === request.requestId) cancelled.add(request.requestId)
      return
    }
    if (activeRequestId) {
      dependencies.post({ type: 'error', requestId: request.requestId, code: 'BUILD_IN_PROGRESS', message: 'BUILD_IN_PROGRESS' }, [])
      return
    }
    activeRequestId = request.requestId
    try {
      const result = await dependencies.build(request, undefined, (progress) => {
        if (cancelled.has(request.requestId)) return
        dependencies.post({ type: 'progress', requestId: request.requestId, ...progress }, [])
      }, () => cancelled.has(request.requestId))
      if (cancelled.has(request.requestId)) throw new BuildCancelledError()
      dependencies.post({ type: 'complete', requestId: request.requestId, ...result }, [result.zip])
    } catch (error) {
      const code = error instanceof BuildCancelledError
        ? error.code
        : typeof error === 'object' && error && 'code' in error && typeof error.code === 'string'
          ? error.code
          : 'BUILD_FAILED'
      const message = error instanceof Error ? error.message : code
      dependencies.post({
        type: 'error',
        requestId: request.requestId,
        code,
        message,
        details: sanitizeWorkerErrorDetails(error),
      }, [])
    } finally {
      cancelled.delete(request.requestId)
      if (activeRequestId === request.requestId) activeRequestId = undefined
    }
  }
}

if (typeof self !== 'undefined') {
  self.onmessage = createBitmapFontWorkerHandler({
    build: buildBitmapFontPackage,
    post: (response, transfer) => self.postMessage(response, { transfer }),
  })
}
