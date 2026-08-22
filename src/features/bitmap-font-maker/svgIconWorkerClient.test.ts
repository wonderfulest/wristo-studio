import { describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { SvgIconBitmapFontWorkerClient } from './svgIconWorkerClient'

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  onmessageerror: (() => void) | null = null
  posts: Array<{ message: any; transfer?: Transferable[] }> = []
  postMessage(message: any, transfer?: Transferable[]) { this.posts.push({ message, transfer }) }
  terminate() {}
  emit(data: unknown) { this.onmessage?.({ data } as MessageEvent) }
}

describe('SvgIconBitmapFontWorkerClient', () => {
  it('prepares SVG raster data as part of generation without a separate preflight result', async () => {
    const worker = new FakeWorker()
    const decodeSvg = vi.fn(async () => ({ width: 2, height: 2, alpha: new Uint8ClampedArray([0, 255, 255, 0]) }))
    const client = new SvgIconBitmapFontWorkerClient({
      createWorker: () => worker as unknown as Worker,
      supportsOffscreenCanvas: () => true,
      decodeSvg,
    })
    const handle = await client.build({
      slug: 'icon-font-20260822-a3f2',
      type: 'icon_font',
      charsetProfile: 'wristo-icon-v1',
      slots: [{ iconUnicode: '0030', codepoint: 0x30, symbolCode: 'heart_rate', label: 'Heart rate' }],
      sources: [{ iconUnicode: '0030', fileName: '0030-heart_rate.svg', svg: '<svg></svg>' }],
      recipe: { schemaVersion: 1, rendererVersion: '1', contentScale: 0.88, antialias: true },
    })

    expect(worker.posts[0].message).toMatchObject({
      type: 'build',
      fontType: 'icon_font',
      charsetProfile: 'wristo-icon-v1',
      slots: [{ iconUnicode: '0030', codepoint: 0x30 }],
    })
    expect(decodeSvg).toHaveBeenCalledTimes(1)
    expect(worker.posts[0].message.sources[0]).toMatchObject({ sampleWidth: 2, sampleHeight: 2 })
    expect(worker.posts[0].transfer).toHaveLength(2)
    worker.emit({ type: 'complete', requestId: handle.requestId, zip: new ArrayBuffer(2), manifest: { type: 'icon_font' } })
    await expect(handle.result).resolves.toMatchObject({ manifest: { type: 'icon_font' } })
  })

  it('converts reactive slots into cloneable worker data', async () => {
    const worker = new FakeWorker()
    worker.postMessage = (message: any, transfer?: Transferable[]) => {
      structuredClone(message)
      worker.posts.push({ message, transfer })
    }
    const client = new SvgIconBitmapFontWorkerClient({
      createWorker: () => worker as unknown as Worker,
      supportsOffscreenCanvas: () => true,
      decodeSvg: async () => ({ width: 1, height: 1, alpha: new Uint8ClampedArray([255]) }),
    })

    await client.build({
      slug: 'icons',
      type: 'icon_font',
      charsetProfile: 'wristo-icon-v1',
      slots: reactive([{ iconUnicode: '0030', codepoint: 0x30, symbolCode: 'heart_rate', label: 'Heart rate' }]),
      sources: [{ iconUnicode: '0030', fileName: '0030-heart_rate.svg', svg: '<svg></svg>' }],
      recipe: { schemaVersion: 1, rendererVersion: '1', contentScale: 0.88, antialias: true },
    })

    expect(worker.posts).toHaveLength(1)
  })

  it('surfaces SVG preparation failures as generation errors without a preflight wrapper', async () => {
    const worker = new FakeWorker()
    const client = new SvgIconBitmapFontWorkerClient({
      createWorker: () => worker as unknown as Worker,
      supportsOffscreenCanvas: () => true,
      decodeSvg: async (svg) => {
        if (svg.includes('broken')) throw Object.assign(new Error('SVG_ICON_DECODE_FAILED'), { code: 'SVG_ICON_DECODE_FAILED' })
        return { width: 1, height: 1, alpha: new Uint8ClampedArray([255]) }
      },
    })

    const build = client.build({
      slug: 'icons',
      type: 'icon_font',
      charsetProfile: 'wristo-icon-v1',
      slots: [
        { iconUnicode: '0030', codepoint: 0x30, symbolCode: 'heart_rate', label: 'Heart rate' },
        { iconUnicode: '0031', codepoint: 0x31, symbolCode: 'steps', label: 'Steps' },
        { iconUnicode: '0032', codepoint: 0x32, symbolCode: 'battery', label: 'Battery' },
      ],
      sources: [
        { iconUnicode: '0030', fileName: '0030-heart_rate.svg', svg: '<svg>broken one</svg>' },
        { iconUnicode: '0031', fileName: '0031-steps.svg', svg: '<svg></svg>' },
        { iconUnicode: '0032', fileName: '0032-battery.svg', svg: '<svg>broken two</svg>' },
      ],
      recipe: { schemaVersion: 1, rendererVersion: '1', contentScale: 0.88, antialias: true },
    })

    await expect(build).rejects.toMatchObject({ code: 'SVG_ICON_DECODE_FAILED' })
    expect(worker.posts).toHaveLength(0)
  })
})
