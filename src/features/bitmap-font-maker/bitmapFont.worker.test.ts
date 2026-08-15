import { describe, expect, it, vi } from 'vitest'
import { BuildCancelledError, type BitmapFontBuildRequest, type BitmapFontBuildResult } from './packageBuilder'
import { createBitmapFontWorkerHandler } from './bitmapFont.worker'
import type { BitmapFontWorkerResponse } from './workerProtocol'
import type { BitmapFontRecipe } from './contracts'

const recipe: BitmapFontRecipe = { schemaVersion: 1, rendererVersion: '1', fontWeight: 400, italicAngle: 0, outlineWidthEm: 0, outlineMode: 'fill', lineJoin: 'round', antialias: true }
const buildRequest = { type: 'build' as const, requestId: 'request-1', source: new Uint8Array([1, 2, 3]).buffer, fileName: 'fixture.ttf', slug: 'fixture', fontType: 'number_font' as const, recipe }

describe('createBitmapFontWorkerHandler', () => {
  it('passes source into the builder and transfers the completed ZIP', async () => {
    const zip = new ArrayBuffer(4)
    const result = { zip, manifest: { slug: 'fixture' } } as BitmapFontBuildResult
    let receivedSource!: ArrayBuffer
    const build = vi.fn(async (request: BitmapFontBuildRequest) => { receivedSource = request.source; return result })
    const post = vi.fn()
    const handle = createBitmapFontWorkerHandler({ build, post })
    await handle({ data: buildRequest } as MessageEvent)
    expect(new Uint8Array(receivedSource)).toEqual(new Uint8Array([1, 2, 3]))
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ type: 'complete', requestId: 'request-1', zip }), [zip])
  })

  it('handles cancel cooperatively and emits only BUILD_CANCELLED after cancellation', async () => {
    let continueBuild!: () => void
    const post = vi.fn()
    const build = vi.fn(async (_request, _adapters, onProgress, isCancelled) => {
      await new Promise<void>((resolve) => { continueBuild = resolve })
      if (isCancelled()) throw new BuildCancelledError()
      onProgress({ completed: 1, size: 6, total: 38 })
      return { zip: new ArrayBuffer(1), manifest: {} } as BitmapFontBuildResult
    })
    const handle = createBitmapFontWorkerHandler({ build, post })
    const pending = handle({ data: buildRequest } as MessageEvent)
    await vi.waitFor(() => expect(continueBuild).toBeTypeOf('function'))
    await handle({ data: { type: 'cancel', requestId: 'request-1' } } as MessageEvent)
    continueBuild()
    await pending
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', requestId: 'request-1', code: 'BUILD_CANCELLED' }), [])
  })

  it('sanitizes error details into small structured-clone-safe scalars', async () => {
    const error = Object.assign(new Error('failed'), { code: 'GLYPH_FAILED', codepoint: 48, size: 312, buffer: new ArrayBuffer(1024), nested: { secret: 'no' } })
    const posts: Array<[BitmapFontWorkerResponse, Transferable[]]> = []
    const post = vi.fn((response: BitmapFontWorkerResponse, transfer: Transferable[]) => { posts.push([response, transfer]) })
    const handle = createBitmapFontWorkerHandler({ build: vi.fn(async () => { throw error }), post })
    await handle({ data: buildRequest } as MessageEvent)
    const response = posts[0][0]
    expect(response).toMatchObject({ type: 'error', code: 'GLYPH_FAILED', details: { codepoint: 48, size: 312 } })
    expect(structuredClone(response)).toEqual(response)
    expect(JSON.stringify(response)).not.toContain('secret')
    expect(posts[0][1]).toEqual([])
  })
})
