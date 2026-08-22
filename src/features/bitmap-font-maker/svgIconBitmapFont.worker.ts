/// <reference lib="webworker" />
import { buildSvgIconBitmapFontPackage } from './svgIconPackageBuilder'
import type { SvgIconWorkerRequest, SvgIconWorkerResponse } from './svgIconWorkerProtocol'

const scope = self as unknown as DedicatedWorkerGlobalScope
let activeRequestId = ''
let cancelled = false

const post = (response: SvgIconWorkerResponse, transfer: Transferable[] = []) => scope.postMessage(response, transfer)

scope.onmessage = async (event: MessageEvent<SvgIconWorkerRequest>) => {
  const request = event.data
  if (request.type === 'cancel') {
    if (request.requestId === activeRequestId) cancelled = true
    return
  }
  if (activeRequestId) {
    post({ type: 'error', requestId: request.requestId, code: 'BUILD_IN_PROGRESS', message: 'BUILD_IN_PROGRESS' })
    return
  }
  activeRequestId = request.requestId
  cancelled = false
  try {
    const sources = request.sources.map((source) => ({
      iconUnicode: source.iconUnicode,
      fileName: source.fileName,
      svg: new TextDecoder().decode(source.svg),
      raster: {
        width: source.sampleWidth,
        height: source.sampleHeight,
        alpha: new Uint8ClampedArray(source.sampleAlpha),
      },
    }))
    const result = await buildSvgIconBitmapFontPackage(
      {
        slug: request.slug,
        type: request.fontType,
        charsetProfile: request.charsetProfile,
        slots: request.slots,
        recipe: request.recipe,
        sources,
      },
      undefined,
      (progress) => post({ type: 'progress', requestId: request.requestId, ...progress }),
      () => cancelled,
    )
    post({ type: 'complete', requestId: request.requestId, zip: result.zip, manifest: result.manifest }, [result.zip])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'SVG_ICON_BUILD_FAILED'
    post({ type: 'error', requestId: request.requestId, code: message, message })
  } finally {
    activeRequestId = ''
    cancelled = false
  }
}
