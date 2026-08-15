/// <reference lib="webworker" />
import { buildBitmapFontPackage, BuildCancelledError } from './packageBuilder'
import type { BitmapFontWorkerRequest, BitmapFontWorkerResponse } from './workerProtocol'

const cancelled = new Set<string>()

function safeDetails(error: unknown): Record<string, string | number | boolean> | undefined {
  if (!error || typeof error !== 'object') return undefined
  const details: Record<string, string | number | boolean> = {}
  for (const key of ['codepoint', 'size'] as const) {
    const value = (error as Record<string, unknown>)[key]
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') details[key] = value
  }
  return Object.keys(details).length ? details : undefined
}

self.onmessage = async (event: MessageEvent<BitmapFontWorkerRequest>) => {
  const request = event.data
  if (request.type === 'cancel') {
    cancelled.add(request.requestId)
    return
  }
  try {
    const result = await buildBitmapFontPackage(request, undefined, (progress) => {
      const response: BitmapFontWorkerResponse = { type: 'progress', requestId: request.requestId, ...progress }
      self.postMessage(response)
    }, () => cancelled.has(request.requestId))
    const response: BitmapFontWorkerResponse = { type: 'complete', requestId: request.requestId, ...result }
    self.postMessage(response, { transfer: [result.zip] })
  } catch (error) {
    const code = error instanceof BuildCancelledError ? error.code : typeof error === 'object' && error && 'code' in error && typeof error.code === 'string' ? error.code : 'BUILD_FAILED'
    const message = error instanceof Error ? error.message : code
    const response: BitmapFontWorkerResponse = { type: 'error', requestId: request.requestId, code, message, details: safeDetails(error) }
    self.postMessage(response)
  } finally {
    cancelled.delete(request.requestId)
  }
}
