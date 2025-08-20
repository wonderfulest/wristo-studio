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
  formData.append('type', meta.type)
  formData.append('weight', meta.weight)
  formData.append('versionName', meta.versionName)
  formData.append('glyphCount', String(meta.glyphCount))
  formData.append('language', meta.language)
  formData.append('ttf', file, file.name)
  if (meta.slug) formData.append('slug', meta.slug)
  if (typeof meta.isSystem !== 'undefined') formData.append('isSystem', String(meta.isSystem))

  return instance.post(
    '/dsn/fonts/upload',
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
// 根据 slug 获取字体详情
export const getFontBySlug = (slug: string): Promise<ApiResponse<DesignFontVO>> => {
  return instance.get(`/dsn/fonts/get-by-slug/${slug}`)
}

// 获取已审核并启用的系统字体
export const getSystemFonts = (): Promise<ApiResponse<DesignFontVO[]>> => {
  return instance.get('/dsn/fonts/sys-fonts')
}
