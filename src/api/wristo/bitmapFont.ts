import instance from '@/config/axios'
import type { ApiResponse, PageResponse } from '@/types/api'

// ---- Types (front-end copy of backend DTO/VO) ----

export interface FileVO {
  id: number
  name: string
  usageType?: string
  url?: string
  previewUrl?: string
  provider?: string
}

export interface BitmapFontVO {
  id: number
  fontName: string
  isDefault?: number
  version?: number
  isActive?: number
  userId?: number
  createdAt?: string
  updatedAt?: string
}

export interface BitmapFontPageQueryDTO {
  pageNum: number
  pageSize: number
  keyword?: string
  isActive?: number
  orderBy?: string
}

export interface BitmapFontCreateDTO {
  fontName: string
  isDefault?: number
}

export interface BitmapFontUpdateDTO {
  id: number
  fontName?: string
  isDefault?: number
  isActive?: number
}

export interface BitmapFontAssetRelationVO {
  id: number
  fontId: number
  assetId: number
  charType: string // e.g. 'digital' | 'custom'
  charValue: string
  version?: number
  isActive?: number
  userId?: number
  createdAt?: string
  updatedAt?: string
  image?: FileVO
}

export interface BitmapFontBindAssetPayload {
  file: File
  fontId: number
  charType: string
  charValue: string
}

// ---- API functions ----

export const pageBitmapFonts = (
  dto: BitmapFontPageQueryDTO,
): Promise<ApiResponse<PageResponse<BitmapFontVO>>> => {
  return instance.post('/dsn/bitmap-font/page', dto)
}

export const listAllBitmapFonts = (): Promise<ApiResponse<BitmapFontVO[]>> => {
  return instance.get('/dsn/bitmap-font/list-all')
}

export const createBitmapFont = (
  dto: BitmapFontCreateDTO,
): Promise<ApiResponse<BitmapFontVO>> => {
  return instance.post('/dsn/bitmap-font/create', dto)
}

export const updateBitmapFont = (
  dto: BitmapFontUpdateDTO,
): Promise<ApiResponse<BitmapFontVO>> => {
  return instance.post('/dsn/bitmap-font/update', dto)
}

export const getBitmapFontDetail = (id: number): Promise<ApiResponse<BitmapFontVO>> => {
  return instance.get('/dsn/bitmap-font/detail', { params: { id } })
}

export const removeBitmapFont = (id: number): Promise<ApiResponse<boolean>> => {
  return instance.post('/dsn/bitmap-font/remove', undefined, { params: { id } })
}

export const listBitmapFontChars = (
  fontId: number,
): Promise<ApiResponse<BitmapFontAssetRelationVO[]>> => {
  return instance.get('/dsn/bitmap-font/chars', { params: { fontId } })
}

export const bindBitmapFontAsset = (
  payload: BitmapFontBindAssetPayload,
): Promise<ApiResponse<boolean>> => {
  const formData = new FormData()
  formData.append('file', payload.file)
  formData.append('fontId', String(payload.fontId))
  formData.append('charType', payload.charType)
  formData.append('charValue', payload.charValue)

  return instance.post('/dsn/bitmap-font/bind-asset', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const unbindBitmapFontAsset = (relationId: number): Promise<ApiResponse<boolean>> => {
  return instance.post('/dsn/bitmap-font/unbind-asset', undefined, { params: { relationId } })
}
