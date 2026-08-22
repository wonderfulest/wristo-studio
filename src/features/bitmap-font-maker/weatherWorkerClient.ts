import type { WeatherBitmapFontBuildProgress, WeatherBitmapFontBuildRequest, WeatherBitmapFontBuildResult } from './weatherPackageBuilder'
import type { WeatherWorkerResponse } from './weatherWorkerProtocol'
import { prepareWeatherRasterSvg } from './weatherSvgRasterizer'
import { preflightSvgSources } from './svgSourcePreflight'

export class WeatherWorkerClientError extends Error {
  constructor(
    readonly code: string,
    message = code
  ) {
    super(message)
    this.name = 'WeatherWorkerClientError'
  }
}

interface WeatherWorkerClientEnvironment {
  createWorker(): Worker
  supportsOffscreenCanvas(): boolean
  decodeSvg(svg: string): Promise<{ width: number; height: number; alpha: Uint8ClampedArray }>
}

interface PendingBuild {
  resolve(value: WeatherBitmapFontBuildResult): void
  reject(error: WeatherWorkerClientError): void
  onProgress?: (progress: WeatherBitmapFontBuildProgress) => void
}

export interface WeatherBitmapFontBuildHandle {
  requestId: string
  result: Promise<WeatherBitmapFontBuildResult>
  cancel(): void
}

async function decodeSvgToAlpha(svg: string): Promise<{ width: number; height: number; alpha: Uint8ClampedArray }> {
  const size = 1024
  const url = URL.createObjectURL(new Blob([prepareWeatherRasterSvg(svg)], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new WeatherWorkerClientError('WEATHER_SVG_DECODE_FAILED'))
      image.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) throw new WeatherWorkerClientError('BROWSER_UNSUPPORTED')
    context.clearRect(0, 0, size, size)
    context.drawImage(image, 0, 0, size, size)
    const rgba = context.getImageData(0, 0, size, size).data
    const alpha = new Uint8ClampedArray(size * size)
    for (let index = 0; index < alpha.length; index += 1) alpha[index] = rgba[index * 4 + 3]
    return { width: size, height: size, alpha }
  } finally {
    URL.revokeObjectURL(url)
  }
}

const defaultEnvironment: WeatherWorkerClientEnvironment = {
  createWorker: () => new Worker(new URL('./weatherBitmapFont.worker.ts', import.meta.url), { type: 'module' }),
  supportsOffscreenCanvas: () => typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof document !== 'undefined' && typeof Image !== 'undefined',
  decodeSvg: decodeSvgToAlpha
}

export class WeatherBitmapFontWorkerClient {
  private readonly worker: Worker
  private readonly environment: WeatherWorkerClientEnvironment
  private pending: PendingBuild | undefined
  private preparing = false
  private disposed = false
  private sequence = 0

  constructor(environment: WeatherWorkerClientEnvironment = defaultEnvironment) {
    if (!environment.supportsOffscreenCanvas()) throw new WeatherWorkerClientError('BROWSER_UNSUPPORTED')
    this.environment = environment
    this.worker = environment.createWorker()
    this.worker.onmessage = (event) => this.receive(event.data as WeatherWorkerResponse)
    this.worker.onerror = () => this.fail('WORKER_FAILED')
    this.worker.onmessageerror = () => this.fail('WORKER_FAILED')
  }

  async build(request: WeatherBitmapFontBuildRequest, onProgress?: (progress: WeatherBitmapFontBuildProgress) => void): Promise<WeatherBitmapFontBuildHandle> {
    if (this.disposed) throw new WeatherWorkerClientError('WORKER_DISPOSED')
    if (this.pending || this.preparing) throw new WeatherWorkerClientError('BUILD_IN_PROGRESS')
    this.preparing = true
    let preparedSources: Awaited<ReturnType<typeof preflightSvgSources<WeatherBitmapFontBuildRequest['sources'][number]>>>
    try {
      preparedSources = await preflightSvgSources(request.sources, this.environment.decodeSvg)
    } finally {
      this.preparing = false
    }
    if (this.disposed) throw new WeatherWorkerClientError('WORKER_DISPOSED')
    const requestId = `weather-bitmap-${Date.now()}-${(this.sequence += 1)}`
    let resolve!: PendingBuild['resolve']
    let reject!: PendingBuild['reject']
    const result = new Promise<WeatherBitmapFontBuildResult>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise
      reject = rejectPromise
    })
    this.pending = { resolve, reject, onProgress }
    const encodedSources = preparedSources.map((source) => ({
      iconUnicode: source.iconUnicode,
      fileName: source.fileName,
      svg: new TextEncoder().encode(source.svg).buffer,
      sampleWidth: source.raster.width,
      sampleHeight: source.raster.height,
      sampleAlpha: source.raster.alpha.buffer
    }))
    const transfer = encodedSources.flatMap((source) => [source.svg, source.sampleAlpha])
    this.worker.postMessage({ type: 'build', requestId, slug: request.slug, recipe: request.recipe, sources: encodedSources }, transfer)
    return { requestId, result, cancel: () => this.worker.postMessage({ type: 'cancel', requestId }) }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.worker.terminate()
    this.fail('WORKER_DISPOSED')
  }

  private receive(response: WeatherWorkerResponse): void {
    if (!this.pending) return
    if (response.type === 'progress') {
      this.pending.onProgress?.({ completed: response.completed, size: response.size, total: response.total })
      return
    }
    const pending = this.pending
    this.pending = undefined
    if (response.type === 'complete') pending.resolve({ zip: response.zip, manifest: response.manifest })
    else pending.reject(new WeatherWorkerClientError(response.code, response.message))
  }

  private fail(code: string): void {
    const pending = this.pending
    this.pending = undefined
    pending?.reject(new WeatherWorkerClientError(code))
  }
}
