import type {
  SvgIconBitmapFontBuildProgress,
  SvgIconBitmapFontBuildRequest,
  SvgIconBitmapFontBuildResult,
} from './svgIconPackageBuilder'
import type { SvgIconWorkerResponse } from './svgIconWorkerProtocol'
import { prepareWeatherRasterSvg } from './weatherSvgRasterizer'

export class SvgIconWorkerClientError extends Error {
  constructor(readonly code: string, message = code) {
    super(message)
    this.name = 'SvgIconWorkerClientError'
  }
}

export interface SvgIconWorkerClientEnvironment {
  createWorker(): Worker
  supportsOffscreenCanvas(): boolean
  decodeSvg(svg: string): Promise<{ width: number; height: number; alpha: Uint8ClampedArray }>
}

interface PendingBuild {
  resolve(value: SvgIconBitmapFontBuildResult): void
  reject(error: SvgIconWorkerClientError): void
  onProgress?: (progress: SvgIconBitmapFontBuildProgress) => void
}

async function decodeSvgToAlpha(svg: string): Promise<{ width: number; height: number; alpha: Uint8ClampedArray }> {
  const size = 1024
  const url = URL.createObjectURL(new Blob([prepareWeatherRasterSvg(svg)], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new SvgIconWorkerClientError('SVG_ICON_DECODE_FAILED'))
      image.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) throw new SvgIconWorkerClientError('BROWSER_UNSUPPORTED')
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

export interface SvgIconBitmapFontBuildHandle {
  requestId: string
  result: Promise<SvgIconBitmapFontBuildResult>
  cancel(): void
}

const defaultEnvironment: SvgIconWorkerClientEnvironment = {
  createWorker: () => new Worker(new URL('./svgIconBitmapFont.worker.ts', import.meta.url), { type: 'module' }),
  supportsOffscreenCanvas: () => typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof document !== 'undefined' && typeof Image !== 'undefined',
  decodeSvg: decodeSvgToAlpha,
}

export class SvgIconBitmapFontWorkerClient {
  private readonly worker: Worker
  private readonly environment: SvgIconWorkerClientEnvironment
  private pending: PendingBuild | undefined
  private preparing = false
  private disposed = false
  private sequence = 0

  constructor(environment: SvgIconWorkerClientEnvironment = defaultEnvironment) {
    if (!environment.supportsOffscreenCanvas()) throw new SvgIconWorkerClientError('BROWSER_UNSUPPORTED')
    this.environment = environment
    this.worker = environment.createWorker()
    this.worker.onmessage = (event) => this.receive(event.data as SvgIconWorkerResponse)
    this.worker.onerror = () => this.fail('WORKER_FAILED')
    this.worker.onmessageerror = () => this.fail('WORKER_FAILED')
  }

  async build(request: SvgIconBitmapFontBuildRequest, onProgress?: (progress: SvgIconBitmapFontBuildProgress) => void): Promise<SvgIconBitmapFontBuildHandle> {
    if (this.disposed) throw new SvgIconWorkerClientError('WORKER_DISPOSED')
    if (this.pending || this.preparing) throw new SvgIconWorkerClientError('BUILD_IN_PROGRESS')
    this.preparing = true
    let preparedSources: Array<SvgIconBitmapFontBuildRequest['sources'][number] & { raster: { width: number; height: number; alpha: Uint8ClampedArray } }>
    try {
      preparedSources = await Promise.all(request.sources.map(async (source) => ({
        ...source,
        raster: await this.environment.decodeSvg(source.svg),
      })))
    } catch (reason) {
      if (reason instanceof SvgIconWorkerClientError) throw reason
      const code = reason && typeof reason === 'object' && typeof (reason as { code?: unknown }).code === 'string'
        ? String((reason as { code: string }).code)
        : reason instanceof Error ? reason.message : 'SVG_ICON_DECODE_FAILED'
      throw new SvgIconWorkerClientError(code)
    } finally {
      this.preparing = false
    }
    if (this.disposed) throw new SvgIconWorkerClientError('WORKER_DISPOSED')
    const requestId = `svg-icon-bitmap-${Date.now()}-${(this.sequence += 1)}`
    let resolve!: PendingBuild['resolve']
    let reject!: PendingBuild['reject']
    const result = new Promise<SvgIconBitmapFontBuildResult>((resolvePromise, rejectPromise) => {
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
      sampleAlpha: source.raster.alpha.buffer,
    }))
    const workerSlots = request.slots.map((slot) => ({
      iconUnicode: slot.iconUnicode,
      codepoint: slot.codepoint,
      symbolCode: slot.symbolCode,
      label: slot.label,
    }))
    const workerRecipe = {
      schemaVersion: request.recipe.schemaVersion,
      rendererVersion: request.recipe.rendererVersion,
      contentScale: request.recipe.contentScale,
      antialias: request.recipe.antialias,
    } as const
    const transfer = encodedSources.flatMap((source) => [source.svg, source.sampleAlpha])
    this.worker.postMessage({
      type: 'build',
      requestId,
      slug: request.slug,
      fontType: request.type,
      charsetProfile: request.charsetProfile,
      slots: workerSlots,
      recipe: workerRecipe,
      sources: encodedSources,
    }, transfer)
    return { requestId, result, cancel: () => this.worker.postMessage({ type: 'cancel', requestId }) }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.worker.terminate()
    this.fail('WORKER_DISPOSED')
  }

  private receive(response: SvgIconWorkerResponse): void {
    if (!this.pending) return
    if (response.type === 'progress') {
      this.pending.onProgress?.({ completed: response.completed, size: response.size, total: response.total })
      return
    }
    const pending = this.pending
    this.pending = undefined
    if (response.type === 'complete') pending.resolve({ zip: response.zip, manifest: response.manifest })
    else pending.reject(new SvgIconWorkerClientError(response.code, response.message))
  }

  private fail(code: string): void {
    const pending = this.pending
    this.pending = undefined
    pending?.reject(new SvgIconWorkerClientError(code))
  }
}
