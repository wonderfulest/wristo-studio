import instance from '@/config/axios'
import type { ApiResponse, UserInfo } from '@/types/api'

export const logout = async () : Promise<ApiResponse<string>> => {
  return instance.post('/public/auth/logout')
}

export const getUserInfo = () : Promise<ApiResponse<UserInfo>> => {
  return instance.get('/users/info')
}

export interface SsoTokenRequestDto {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface SsoTokenResponseData {
  accessToken: string
  expiresIn: number
  refreshToken: string
  tokenType: string
  idToken: string
}

export const fetchSsoToken = (data: SsoTokenRequestDto): Promise<ApiResponse<SsoTokenResponseData>> => {
  return instance.post('/public/sso/token', data)
}