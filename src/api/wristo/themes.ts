import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

// 获取某个 app 的主题规则详情
export const getThemeRuleDetail = (appId: number): Promise<ApiResponse<any>> => {
  return instance.get('/dsn/themes/rules/detail', {
    params: { appId },
  })
}

// 创建 / 更新某个 app 的主题规则
export const upsertThemeRule = (data: {
  appId: number
  ruleType: string
  ruleCalculation: string
  active: number
}): Promise<ApiResponse<any>> => {
  return instance.post('/dsn/themes/rules/upsert', data)
}

// 单独控制规则是否生效
export const activateThemeRule = (params: {
  appId: number
  isActive: boolean
}): Promise<ApiResponse<any>> => {
  return instance.post('/dsn/themes/rules/activate', null, { params })
}
