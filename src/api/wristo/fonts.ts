import instance from '@/config/axios'
import type { DesignFontVO, DesignFontSearchDTO } from '@/types/font'
import type { ApiResponse, PageResponse } from '@/types/api/api'

/**
 * 上传字体文件（仅 file + type）
 * @param {File} file - 字体文件（TTF/OTF）
 * @param {string} type - 设计师字体类型枚举字符串
 * @returns {Promise} 上传结果
 */
export const uploadFontFile =  (
  file: File,
  type: string
): Promise<ApiResponse<DesignFontVO>> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)
  return instance.post(
    '/dsn/fonts/upload?populate=ttf',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
}

// 搜索字体（支持多条件 + 分页）
export const searchFonts = (
  params: DesignFontSearchDTO
): Promise<ApiResponse<PageResponse<DesignFontVO>>> => {
  // server supports extended filters including type; userId may be provided for auditing/stat
  return instance.post('/dsn/fonts/search?populate=ttf', params)
}

// 根据类型分页获取当前设计师可以使用的字体
export const getDesignerUsageFontsPage = (
  params: {
    pageNum: number
    pageSize: number
    type: string
    isMonospace?: number
    italic?: number
    weight?: string
    subfamily?: string
  }
): Promise<ApiResponse<PageResponse<DesignFontVO>>> => {
  return instance.get('/dsn/fonts/usage/page', { params })
}

// 根据 name 获取字体
export const getFontByName = (name: string): Promise<ApiResponse<DesignFontVO>> => {
  return instance.get(`/dsn/fonts/get-by-name/${name}?populate=ttf`)
}

// 根据 slug 获取字体详情
export const getFontBySlug = (slug: string): Promise<ApiResponse<DesignFontVO>> => {
  return instance.get(`/dsn/fonts/get-by-slug/${slug}?populate=ttf`)
}

// 获取已审核并启用的系统字体
export const getSystemFonts = (type?: string, userId?: number): Promise<ApiResponse<DesignFontVO[]>> => {
  const params = new URLSearchParams()
  if (type) params.set('type', type)
  if (typeof userId === 'number') params.set('user_id', String(userId))
  params.set('populate', 'ttf')
  const q = params.toString()
  return instance.get(`/dsn/fonts/system${q ? `?${q}` : ''}`)
}

// increase usage by slug
export const increaseFontUsage = (slug: string, userId?: number): Promise<ApiResponse<number>> => {
  const params = new URLSearchParams()
  if (typeof userId === 'number') params.set('user_id', String(userId))
  const q = params.toString()
  return instance.post(`/dsn/fonts/use/${encodeURIComponent(slug)}${q ? `?${q}` : ''}`)
}

// recent fonts for current designer
export const getRecentFonts = (limit?: number, type?: string, userId?: number): Promise<ApiResponse<DesignFontVO[]>> => {
  const params = new URLSearchParams()
  if (typeof limit === 'number') params.set('limit', String(limit))
  if (type) params.set('type', type)
  if (typeof userId === 'number') params.set('user_id', String(userId))
  params.set('populate', 'ttf')
  const q = params.toString()
  return instance.get(`/dsn/fonts/recent${q ? `?${q}` : ''}`)
}

// public: list available font types
export const getFontTypes = (): Promise<ApiResponse<string[]>> => {
  return instance.get('/public/fonts/types')
}

// frequent fonts for current designer
export const getFrequentFonts = (limit?: number): Promise<ApiResponse<DesignFontVO[]>> => {
  const q = typeof limit === 'number' ? `?limit=${limit}` : ''
  return instance.get(`/dsn/fonts/frequent${q}`)
}
