import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api'
import type { UserInfo } from '@/types/user'

export const logout = async () : Promise<ApiResponse<string>> => {
  return instance.post('/public/auth/logout')
}

export const getUserInfo = () : Promise<ApiResponse<UserInfo>> => {
  return instance.get('/users/info')
}

export const fetchSsoToken = (data: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
}): Promise<ApiResponse<{
  accessToken: string
  expiresIn: number
  refreshToken: string
  tokenType: string
  idToken: string
}>> => {
  return instance.post('/public/sso/token', data)
}