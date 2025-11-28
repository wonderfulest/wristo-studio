import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

export interface FontGlyphCreatePayload {
  glyphCode: string
  style: string
  isDefault?: number
  isActive?: number
  fontType: string
}

export const createFontGlyph = (
  file: File,
  payload: FontGlyphCreatePayload,
): Promise<ApiResponse<any>> => {
  const formData = new FormData()
  formData.append('glyphCode', payload.glyphCode)
  formData.append('style', payload.style)
  formData.append('isDefault', String(payload.isDefault ?? 1))
  formData.append('isActive', String(payload.isActive ?? 1))
  formData.append('fontType', payload.fontType)
  formData.append('file', file)

  return instance.post('/dsn/font-glyph/create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
