import instance from '@/config/axios'
import type { UploadFontMeta, DesignFontVO, DesignFontPageQueryDTO } from '@/types/font'
import type { ApiResponse, PageResponse } from '@/types/api'

/**
 * 上传字体文件
 * @param {File} file - TTF文件
 * @returns {Promise} 上传结果
 */
export const uploadFontFile =  (
  file: File,
  meta: UploadFontMeta
): Promise<ApiResponse<DesignFontVO>> => {
  const formData = new FormData()
  formData.append('fullName', meta.fullName)
  formData.append('postscriptName', meta.postscriptName)
  formData.append('family', meta.family)
  formData.append('subfamily', meta.subfamily)
  formData.append('type', meta.type)
  formData.append('weight', meta.weight)
  formData.append('versionName', meta.versionName)
  formData.append('glyphCount', String(meta.glyphCount))
  formData.append('language', meta.language)
  formData.append('ttf', file, file.name)
  formData.append('isSystem', String(meta.isSystem))
  formData.append('isMonospace', String(meta.isMonospace))
  formData.append('italic', String(meta.italic))
  formData.append('weightClass', String(meta.weightClass))
  formData.append('widthClass', String(meta.widthClass))
  formData.append('copyright', meta.copyright)
  return instance.post(
    '/dsn/fonts/upload?populate=ttf',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
}

// 分页搜索字体
export const getFonts = (
  params: DesignFontPageQueryDTO
): Promise<ApiResponse<PageResponse<DesignFontVO>>> => {
  return instance.post('/dsn/fonts/page?populate=ttf', params)
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
export const getSystemFonts = (): Promise<ApiResponse<DesignFontVO[]>> => {
  return instance.get('/admin/fonts/system?populate=ttf')
}

// increase usage by slug
export const increaseFontUsage = (slug: string): Promise<ApiResponse<number>> => {
  return instance.post(`/dsn/fonts/use/${encodeURIComponent(slug)}`)
}

// recent fonts for current designer
export const getAdminRecentFonts = (limit?: number): Promise<ApiResponse<DesignFontVO[]>> => {
  const q = typeof limit === 'number' ? `?limit=${limit}` : ''
  return instance.get(`/dsn/fonts/recent${q}`)
}

// frequent fonts for current designer
export const getFrequentFonts = (limit?: number): Promise<ApiResponse<DesignFontVO[]>> => {
  const q = typeof limit === 'number' ? `?limit=${limit}` : ''
  return instance.get(`/dsn/fonts/frequent${q}`)
}
