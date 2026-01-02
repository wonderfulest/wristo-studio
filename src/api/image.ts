import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
import type { Image } from '@/types/api/image'

export type ImageVO = Image

// 通过文件上传图片
export const uploadImage = (file: File, aspectCode?: string): Promise<ApiResponse<ImageVO>> => {
  const form = new FormData()
  form.append('file', file)
  if (aspectCode) {
    form.append('aspect', aspectCode)
  }
  return instance.post('/dsn/image/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// 通过 URL 查询图片信息，后端会根据 url 返回 ImageVO
export const findImageByUrl = (url: string): Promise<ApiResponse<ImageVO>> => {
  return instance.post('/dsn/image/find-by-url', null, {
    params: { url },
  })
}
