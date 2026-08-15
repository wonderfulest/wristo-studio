import type { BitmapFontManifest, BitmapFontRecipe, BitmapFontType } from './contracts'
import type { BitmapFontBuildProgress } from './packageBuilder'

export interface BitmapFontWorkerBuildRequest {
  type: 'build'
  requestId: string
  source: ArrayBuffer
  fileName: string
  slug: string
  fontType: BitmapFontType
  recipe: BitmapFontRecipe
}

export interface BitmapFontWorkerCancelRequest { type: 'cancel'; requestId: string }
export type BitmapFontWorkerRequest = BitmapFontWorkerBuildRequest | BitmapFontWorkerCancelRequest
export type BitmapFontWorkerResponse =
  | ({ type: 'progress'; requestId: string } & BitmapFontBuildProgress)
  | { type: 'complete'; requestId: string; zip: ArrayBuffer; manifest: BitmapFontManifest }
  | { type: 'error'; requestId: string; code: string; message: string; details?: unknown }
