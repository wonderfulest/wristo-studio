import type { UserInfo } from './user'

export interface LoginResponseData {
  token: string
  userInfo: UserInfo
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