import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

// VO 对应后端 ThemeConfigVO 的主要字段（只取当前需要的）
export interface ThemeConfigVO {
  id: number
  appId: number
  key: string
  value: string
  imageId?: number | null
  colorJson?: string | null
  weight?: number | null
  priority?: number | null
  isDefault?: number | null
  active?: number | null
  image?: { url?: string } | null
}

// 旧的分页请求参数暂时保留，如不再使用可后续删除
export interface ThemeConfigPageRequest {
  pageNum: number
  pageSize: number
  appId: number
  key?: string
  value?: string
  active?: number
}

export interface ThemeConfigUpsertDTO {
  appId: number
  key: string
  value: string
  imageId?: number | null
  colorJson?: string | null
  weight?: number | null
  priority?: number | null
  active?: number | null
}

// 一次性查询某个 appId + key 下的所有配置值
// 对应后端：GET /api/dsn/themes/configs/all?appId=&key=
export const listThemeConfigsByKey = (
  appId: number,
  key: string,
): Promise<ApiResponse<ThemeConfigVO[]>> => {
  return instance.get('/dsn/themes/configs/all?populate=*', {
    params: { appId, key },
  })
}

// 创建配置
export const createThemeConfig = (
  data: ThemeConfigUpsertDTO,
): Promise<ApiResponse<ThemeConfigVO>> => {
  return instance.post('/dsn/themes/configs/create', data)
}

// 更新配置
export const updateThemeConfig = (
  id: number,
  data: Partial<ThemeConfigUpsertDTO>,
): Promise<ApiResponse<ThemeConfigVO>> => {
  return instance.post(`/dsn/themes/configs/update/${id}`, data)
}

// 删除配置
export const deleteThemeConfig = (id: number): Promise<ApiResponse<void>> => {
  return instance.post(`/dsn/themes/configs/delete/${id}`)
}

// 设置某个配置为默认主题配置
export const setDefaultThemeConfig = (id: number): Promise<ApiResponse<void>> => {
  return instance.post('/dsn/themes/configs/default', undefined, {
    params: { id },
  })
}
