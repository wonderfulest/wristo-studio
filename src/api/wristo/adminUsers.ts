import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

export interface AdminRoleOption {
  id: number
  roleCode: string
}

export interface AdminUserOption {
  id: number
  username: string
  email?: string | null
  roles?: AdminRoleOption[]
}

export const getAdminRoles = (): Promise<ApiResponse<AdminRoleOption[]>> => {
  return instance.get('/admin/roles/list/all')
}

export const searchAdminUsers = (
  keyword: string,
  limit = 20,
  roleId?: number,
): Promise<ApiResponse<AdminUserOption[]>> => {
  return instance.get('/admin/users/search', {
    params: {
      keyword,
      limit,
      roleId,
    },
  })
}
