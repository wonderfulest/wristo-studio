import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

export interface IconAssetVO {
  id: number
  iconId: number
  sourceType: string
  format: string
  svgContent?: string
  imageUrl?: string
  previewUrl?: string
  author?: string
  license?: string
  tags?: string
  version?: number
  isActive?: number
}

export interface IconAssetCropSvgDTO {
  id: number
  svgContent: string
}

export const getIconAssetDetail = (id: number, params?: { populate?: string }): Promise<ApiResponse<IconAssetVO>> => {
  return instance.get(`/dsn/icon-asset/get/${id}`, { params })
}

export const cropIconSvg = (dto: IconAssetCropSvgDTO): Promise<ApiResponse<IconAssetVO>> => {
  return instance.post('/dsn/icon-asset/crop-svg', dto)
}
