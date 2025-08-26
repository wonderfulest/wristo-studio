import axiosInstance from '@/config/axiosConfigStrapi'
import type {
  GetUsersParams,
  UsersResponse,
  UserResponse,
  SetWPayMerchantTokenParams,
  SetWPayMerchantTokenResponse,
} from '@/types/api/users'

/**
 * 获取用户列表
 * @param userIds - 用户ID数组
 * @returns 用户列表数据
 */
export const getUsers = async ({ userIds }: GetUsersParams = {}): Promise<UsersResponse> => {
  const params: Record<string, any> = {
    'pagination[pageSize]': 100,
  }

  if (userIds && userIds.length > 0) {
    userIds.forEach((id, index) => {
      params[`filters[id][$in][${index}]`] = id
    })
  }

  const response = await axiosInstance.get('/users', { params })
  return response || []
}

/**
 * 获取当前用户信息
 * @returns 用户信息
 */
export const getUser = async (): Promise<UserResponse> => {
  const response = await axiosInstance.get(`/users/me`)
  return response.data
}

/**
 * 设置 WPay Merchant Token
 * @param id - 用户ID
 * @param token - WPay Token
 */
export const setWPayMerchantToken = async (
  id: SetWPayMerchantTokenParams['id'],
  token: SetWPayMerchantTokenParams['token']
): Promise<SetWPayMerchantTokenResponse> => {
  const response = await axiosInstance.post(`/users/setWPayMerchantToken`, { id, merchant_token: token })
  return response.data
}
