import type { WeatherBitmapFontBuildProgress, WeatherBitmapFontManifest, WeatherBitmapFontRecipe } from './weatherPackageBuilder'

export interface WeatherWorkerBuildRequest {
  type: 'build'
  requestId: string
  slug: string
  recipe: WeatherBitmapFontRecipe
  sources: Array<{
    iconUnicode: string
    fileName: string
    svg: ArrayBuffer
    sampleWidth: number
    sampleHeight: number
    sampleAlpha: ArrayBuffer
  }>
}

export interface WeatherWorkerCancelRequest {
  type: 'cancel'
  requestId: string
}
export type WeatherWorkerRequest = WeatherWorkerBuildRequest | WeatherWorkerCancelRequest
export type WeatherWorkerResponse =
  | ({ type: 'progress'; requestId: string } & WeatherBitmapFontBuildProgress)
  | { type: 'complete'; requestId: string; zip: ArrayBuffer; manifest: WeatherBitmapFontManifest }
  | { type: 'error'; requestId: string; code: string; message: string }
