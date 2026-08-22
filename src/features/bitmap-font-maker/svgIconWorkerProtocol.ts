import type {
  SvgIconBitmapFontBuildProgress,
  SvgIconBitmapFontManifest,
  SvgIconBitmapFontRecipe,
  SvgIconCharsetProfile,
  SvgIconFontSlot,
  SvgIconFontType,
} from './svgIconPackageBuilder'

export interface SvgIconWorkerBuildRequest {
  type: 'build'
  requestId: string
  slug: string
  fontType: SvgIconFontType
  charsetProfile: SvgIconCharsetProfile
  slots: SvgIconFontSlot[]
  recipe: SvgIconBitmapFontRecipe
  sources: Array<{
    iconUnicode: string
    fileName: string
    svg: ArrayBuffer
    sampleWidth: number
    sampleHeight: number
    sampleAlpha: ArrayBuffer
  }>
}

export interface SvgIconWorkerCancelRequest {
  type: 'cancel'
  requestId: string
}

export type SvgIconWorkerRequest = SvgIconWorkerBuildRequest | SvgIconWorkerCancelRequest
export type SvgIconWorkerResponse =
  | ({ type: 'progress'; requestId: string } & SvgIconBitmapFontBuildProgress)
  | { type: 'complete'; requestId: string; zip: ArrayBuffer; manifest: SvgIconBitmapFontManifest }
  | { type: 'error'; requestId: string; code: string; message: string }
