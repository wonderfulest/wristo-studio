import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
import type { DesignFontVO } from '@/types/font'
import type { BitmapFontManifest, BitmapFontRecipe, BitmapFontType } from '@/features/bitmap-font-maker/contracts'

export interface BitmapFontPublishMetadata {
  fullName: string
  slug: string
  type: BitmapFontType
  language: 'en'
  styleTags: string[]
  searchKeywords: string
  redistributionRightsAttested: boolean
  rightsAttestationVersion: 'v1'
}

export interface BitmapFontPublishInput {
  sourceFont: File
  packageFile: File
  manifest: BitmapFontManifest
  recipe: BitmapFontRecipe
  metadata: BitmapFontPublishMetadata
}

const jsonPart = (value: unknown) => new Blob([JSON.stringify(value)], { type: 'application/json' })

export const publishBitmapFontBuild = ({
  sourceFont,
  packageFile,
  manifest,
  recipe,
  metadata,
}: BitmapFontPublishInput): Promise<ApiResponse<DesignFontVO>> => {
  const formData = new FormData()
  formData.append('sourceFont', sourceFont)
  formData.append('package', packageFile)
  formData.append('manifest', jsonPart(manifest), 'manifest.json')
  formData.append('recipe', jsonPart(recipe), 'recipe.json')
  formData.append('metadata', jsonPart(metadata), 'metadata.json')
  return instance.post('/dsn/fonts/bitmap-build/publish', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
}

export function isBitmapFontSlugConflict(error: unknown): boolean {
  const candidate = error as { code?: unknown; data?: { code?: unknown }; response?: { status?: unknown; data?: { code?: unknown; data?: { code?: unknown } } } }
  return candidate?.response?.status === 409
    || candidate?.code === 411
    || candidate?.data?.code === 411
    || candidate?.response?.data?.code === 411
    || candidate?.response?.data?.data?.code === 411
    || candidate?.code === 'FONT_SLUG_CONFLICT'
    || candidate?.data?.code === 'FONT_SLUG_CONFLICT'
    || candidate?.response?.data?.code === 'FONT_SLUG_CONFLICT'
}
