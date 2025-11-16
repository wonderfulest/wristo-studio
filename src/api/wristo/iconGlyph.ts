import instance from '@/config/axios'
import type { AxiosProgressEvent } from 'axios'
import type { ApiResponse, PageResponse } from '@/types/api/api'

export interface IconGlyphPageQueryDTO {
  pageNum: number
  pageSize: number
  iconId?: number
  active?: number
  isDefault?: number
  keyword?: string
  orderBy?: string
}

export interface IconGlyphVO {
  id: number
  glyphCode: string
  style: string
  isDefault: number
  version: number
  isActive: number
}

export interface IconGlyphCreateDTO {
  glyphCode: string
  style?: string
  isDefault?: number
  isActive?: number
}

export interface IconGlyphAssetPageQueryDTO {
  pageNum: number
  pageSize: number
  glyphId: number
  displayType?: DisplayType
  assetId?: number
  active?: number
  orderBy?: string
}

export interface IconLibraryVO {
  id: number
  iconUnicode: string
  symbolCode: string
  category: string
  label: string
  isActive: number
}

export interface IconAssetVO {
  id: number
  iconId: number
  sourceType: string
  format: string
  displayType?: DisplayType
  svgContent?: string
  imageUrl?: string
  previewUrl?: string
  author?: string
  license?: string
  tags?: string
  version?: number
  isActive?: number
}

export interface IconAssetPageQueryDTO {
  pageNum: number
  pageSize: number
  iconId?: number
  displayType?: DisplayType
  active?: number
  keyword?: string
  orderBy?: string
}

export type DisplayType = 'mip' | 'amoled'

export interface IconGlyphAssetVO {
  id: number
  glyphId: number
  assetId: number
  version: number
  isActive: number
  icon?: IconLibraryVO
  asset?: IconAssetVO
}

export const pageIconGlyphs = (dto: IconGlyphPageQueryDTO): Promise<ApiResponse<PageResponse<IconGlyphVO>>> => {
  return instance.post('/dsn/icon-glyph/page?populate=*', dto)
}

export const pageIconGlyphAssets = (dto: IconGlyphAssetPageQueryDTO): Promise<ApiResponse<PageResponse<IconGlyphAssetVO>>> => {
  return instance.post('/dsn/icon-glyph-asset/page?populate=*', dto)
}

export const createIconGlyph = (dto: IconGlyphCreateDTO): Promise<ApiResponse<IconGlyphVO>> => {
  return instance.post('/dsn/icon-glyph/create', dto)
}

export const pageIconAssets = (dto: IconAssetPageQueryDTO): Promise<ApiResponse<PageResponse<IconAssetVO>>> => {
  return instance.post('/dsn/icon-asset/page', dto)
}

export const bindAssetsToGlyph = (glyphId: number, assetId: number): Promise<ApiResponse<Boolean>> => {
  return instance.post(`/dsn/icon-glyph-asset/bind-to-glyph/${glyphId}?assetId=${assetId}`)
}

export const importAssetsToGlyph = (fromGlyphId: number, toGlyphId: number): Promise<ApiResponse<IconGlyphAssetVO[]>> => {
  const params = new URLSearchParams({ fromGlyphId: String(fromGlyphId), toGlyphId: String(toGlyphId) })
  return instance.post(`/dsn/icon-glyph-asset/import-to-glyph?${params.toString()}`)
}

export const submitIconGlyph = (id: number): Promise<ApiResponse<IconGlyphVO>> => {
  return instance.post(`/dsn/icon-glyph/submit/${id}`)
}

export const uploadIconSvg = (
  file: File,
  unicode?: string,
  displayType?: DisplayType,
  onUploadProgress?: (evt: AxiosProgressEvent) => void,
): Promise<ApiResponse<IconAssetVO>> => {
  const form = new FormData()
  form.append('file', file)
  if (unicode) form.append('unicode', unicode)
  if (displayType) form.append('displayType', displayType)
  return instance.post('/dsn/icon-asset/upload-svg', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
}

export const listIconLibrary = (category?: string): Promise<ApiResponse<IconLibraryVO[]>> => {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return instance.get(`/dsn/icon-library/list${suffix}`)
}

export const getIconAsset = (id: number): Promise<ApiResponse<IconAssetVO>> => {
  return instance.get(`/dsn/icon-asset/get/${id}`)
}
