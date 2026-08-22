import { describe, expect, it, vi } from 'vitest'
import { WeatherBitmapFontWorkerClient } from './weatherWorkerClient'
import { WEATHER_FONT_SLOTS } from './weatherSourceSet'

class FakeWorker {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  onmessageerror: (() => void) | null = null
  posts: Array<{ message: any; transfer?: Transferable[] }> = []
  postMessage(message: any, transfer?: Transferable[]) {
    this.posts.push({ message, transfer })
  }
  terminate() {}
  emit(data: unknown) {
    this.onmessage?.({ data } as MessageEvent)
  }
}

describe('WeatherBitmapFontWorkerClient', () => {
  it('prepares SVG alpha pixels before transferring the build to the worker', async () => {
    const worker = new FakeWorker()
    const decodeSvg = vi.fn(async () => ({ width: 2, height: 2, alpha: new Uint8ClampedArray([0, 255, 255, 0]) }))
    const client = new WeatherBitmapFontWorkerClient({
      createWorker: () => worker as unknown as Worker,
      supportsOffscreenCanvas: () => true,
      decodeSvg
    })
    const progress = vi.fn()
    const handle = await client.build(
      {
        slug: 'my-weather',
        recipe: { schemaVersion: 1, rendererVersion: '1', contentScale: 0.88, antialias: true },
        sources: WEATHER_FONT_SLOTS.map((slot) => ({
          iconUnicode: slot.iconUnicode,
          fileName: `${slot.iconUnicode}.svg`,
          svg: '<svg></svg>'
        }))
      },
      progress
    )

    expect(decodeSvg).toHaveBeenCalledTimes(12)
    expect(worker.posts[0].transfer).toHaveLength(24)
    expect(worker.posts[0].message.sources[0]).toMatchObject({ sampleWidth: 2, sampleHeight: 2 })
    expect(new Uint8ClampedArray(worker.posts[0].message.sources[0].sampleAlpha)).toEqual(new Uint8ClampedArray([0, 255, 255, 0]))
    worker.emit({ type: 'progress', requestId: handle.requestId, completed: 1, size: 6, total: 38 })
    worker.emit({ type: 'complete', requestId: handle.requestId, zip: new ArrayBuffer(2), manifest: { type: 'weather_font' } })
    await expect(handle.result).resolves.toMatchObject({ manifest: { type: 'weather_font' } })
    expect(progress).toHaveBeenCalledWith({ completed: 1, size: 6, total: 38 })
  })
})
