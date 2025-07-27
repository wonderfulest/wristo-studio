import instance from '@/config/axios'
import type { UserInfo } from '@/types/user'
import type { SsoTokenRequestDto, SsoTokenResponseData } from '@/types/sso'

/**
 * Logout
 * @returns {Promise} Logout result
 */
export const logout = async () : Promise<string> => {
  return instance.post('/public/auth/logout')
}

/**
 * Get user info
 * @returns {Promise} User info
 */
export const getUserInfo = () : Promise<UserInfo> => {
  return instance.get('/users/info')
}

/**
 * Exchange SSO code for token
 * @param data SSO token request data
 * @returns Promise with token response data
 */
export const fetchSsoToken = (data: SsoTokenRequestDto): Promise<SsoTokenResponseData> => {
  return instance.post('/public/sso/token', data)
}