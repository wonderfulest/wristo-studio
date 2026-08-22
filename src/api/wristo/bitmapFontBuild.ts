import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
import type { DesignFontVO } from '@/types/font'
import type { BitmapFontManifest, BitmapFontRecipe, BitmapFontType } from '@/features/bitmap-font-maker/contracts'
import type { WeatherBitmapFontManifest, WeatherBitmapFontRecipe } from '@/features/bitmap-font-maker/weatherPackageBuilder'
import type { SvgIconBitmapFontManifest, SvgIconBitmapFontRecipe } from '@/features/bitmap-font-maker/svgIconPackageBuilder'
import { canonicalJson } from '@/features/bitmap-font-maker/deterministicEncoding'

export interface BitmapFontPublishMetadata {
  fullName: string
  slug: string
  type: BitmapFontType | 'icon_font' | 'weather_font'
  language: 'en' | 'zh'
  styleTags: string[]
  searchKeywords: string
  redistributionRightsAttested: boolean
  rightsAttestationVersion: 'v1'
}

export interface WeatherBitmapFontPublishInput {
  glyphId: number
  packageFile: File
  manifest: WeatherBitmapFontManifest
  recipe: WeatherBitmapFontRecipe
  metadata: BitmapFontPublishMetadata & { type: 'weather_font' }
  overwrite?: boolean
}

export interface SvgIconBitmapFontPublishInput {
  glyphId: number
  packageFile: File
  manifest: SvgIconBitmapFontManifest
  recipe: SvgIconBitmapFontRecipe
  metadata: BitmapFontPublishMetadata & { type: 'icon_font' }
  overwrite?: boolean
}

export interface BitmapFontPublishInput {
  sourceFont: File
  packageFile: File
  manifest: BitmapFontManifest
  recipe: BitmapFontRecipe
  metadata: BitmapFontPublishMetadata
  fontId?: number
  overwrite?: boolean
}

const jsonPart = (value: unknown) => new Blob([JSON.stringify(value)], { type: 'application/json' })
const canonicalJsonPart = (value: unknown) => new Blob([canonicalJson(value)], { type: 'application/json' })

export const publishBitmapFontBuild = ({ sourceFont, packageFile, manifest, recipe, metadata, fontId, overwrite }: BitmapFontPublishInput): Promise<ApiResponse<DesignFontVO>> => {
  const formData = new FormData()
  formData.append('sourceFont', sourceFont)
  formData.append('package', packageFile)
  formData.append('manifest', jsonPart(manifest), 'manifest.json')
  formData.append('recipe', canonicalJsonPart(recipe), 'recipe.json')
  formData.append('metadata', jsonPart(metadata), 'metadata.json')
  const search = new URLSearchParams()
  if (overwrite) search.set('overwrite', 'true')
  if (fontId != null) search.set('fontId', String(fontId))
  const query = search.size ? `?${search.toString()}` : ''
  return instance.post(`/dsn/fonts/bitmap-build/publish${query}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
    suppressBusinessErrorCodes: overwrite ? [] : [411]
  })
}

export const publishWeatherBitmapFontBuild = ({ glyphId, packageFile, manifest, recipe, metadata, overwrite }: WeatherBitmapFontPublishInput): Promise<ApiResponse<DesignFontVO>> => {
  const formData = new FormData()
  formData.append('glyphId', String(glyphId))
  formData.append('package', packageFile)
  formData.append('manifest', jsonPart(manifest), 'manifest.json')
  formData.append(
    'recipe',
    jsonPart({
      antialias: recipe.antialias,
      contentScale: recipe.contentScale,
      rendererVersion: recipe.rendererVersion,
      schemaVersion: recipe.schemaVersion
    }),
    'recipe.json'
  )
  formData.append('metadata', jsonPart(metadata), 'metadata.json')
  return instance.post(`/dsn/fonts/bitmap-build/weather/publish${overwrite ? '?overwrite=true' : ''}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
    suppressBusinessErrorCodes: [411]
  })
}

export const publishSvgIconBitmapFontBuild = ({ glyphId, packageFile, manifest, recipe, metadata, overwrite }: SvgIconBitmapFontPublishInput): Promise<ApiResponse<DesignFontVO>> => {
  const formData = new FormData()
  formData.append('glyphId', String(glyphId))
  formData.append('package', packageFile)
  formData.append('manifest', jsonPart(manifest), 'manifest.json')
  formData.append(
    'recipe',
    jsonPart({
      antialias: recipe.antialias,
      contentScale: recipe.contentScale,
      rendererVersion: recipe.rendererVersion,
      schemaVersion: recipe.schemaVersion
    }),
    'recipe.json'
  )
  formData.append('metadata', jsonPart(metadata), 'metadata.json')
  return instance.post(`/dsn/fonts/bitmap-build/svg-icon/publish${overwrite ? '?overwrite=true' : ''}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
    suppressBusinessErrorCodes: [411]
  })
}

export function isBitmapFontSlugConflict(error: unknown): boolean {
  const candidate = error as { code?: unknown; data?: { code?: unknown }; response?: { status?: unknown; data?: { code?: unknown; data?: { code?: unknown } } } }
  return (
    candidate?.response?.status === 409 ||
    candidate?.code === 411 ||
    candidate?.data?.code === 411 ||
    candidate?.response?.data?.code === 411 ||
    candidate?.response?.data?.data?.code === 411 ||
    candidate?.code === 'FONT_SLUG_CONFLICT' ||
    candidate?.data?.code === 'FONT_SLUG_CONFLICT' ||
    candidate?.response?.data?.code === 'FONT_SLUG_CONFLICT'
  )
}
