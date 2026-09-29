import type { UserInfo } from './user'

export interface LoginResponseData {
  token: string
  userInfo: UserInfo
}

export interface SsoTokenRequestDto {
  codeVerifier: string
  code: string
  clientId: string
  redirectUri: string
}

export interface SsoTokenResponseData {
  accessToken: string
  expiresIn: number
  refreshToken: string
  tokenType: string
  idToken: string
} 
