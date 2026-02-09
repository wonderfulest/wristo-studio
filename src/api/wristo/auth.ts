import instance from '@/config/axios'
import type { UserInfo } from '@/types/user'
import type { SsoTokenRequestDto, SsoTokenResponseData } from '@/types/sso'
import { ApiResponse } from '@/types/api/api'

export interface UpdateMyInfoPayload {
  username?: string
  nickname?: string
  avatar?: string
  status?: number
  deviceId?: string
}

/**
 * Logout
 * @returns {Promise} Logout result
 */
export const logout = async () : Promise<ApiResponse<string>> => {
  return instance.post('/auth/logout')
}

/**
 * Get user info
 * @returns {Promise} User info
 */
export const getUserInfo = () : Promise<ApiResponse<UserInfo>> => {
  return instance.get('/users/info?populate=*')
}

/**
 * 更新当前用户信息
 */
export const updateMyInfo = async (payload: UpdateMyInfoPayload): Promise<any> => {
  return instance.post(`/users/update/my-info`, payload)
}

/**
 * Exchange SSO code for token
 * @param data SSO token request data
 * @returns Promise with token response data
 */
export const fetchSsoToken = (data: SsoTokenRequestDto): Promise<ApiResponse<SsoTokenResponseData>> => {
  return instance.post('/public/sso/token', data)
}