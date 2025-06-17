import axiosInstance from '@/config/axiosConfigStrapi'

/**
 * 获取用户列表
 * @param {Array} userIds - 用户ID数组
 * @returns {Promise} 用户列表数据
 */
export const getUsers = async (userIds) => {
  // 创建查询参数对象
  const params = {
    'pagination[pageSize]': 100,
  }

  // 如果有用户ID，使用正确的格式添加过滤条件
  if (userIds && userIds.length > 0) {
    userIds.forEach((id, index) => {
      params[`filters[id][$in][${index}]`] = id
    })
  }
  
  const response = await axiosInstance.get('/users', { params })
  return response || []
}

/**
 * 获取用户信息
 * @param {string} id - 用户ID
 * @returns {Promise} 用户信息
 */
export const getUser = async () => {
  const response = await axiosInstance.get(`/users/me`)
  return response.data
}

/**
 * 设置 WPay Merchant Token
 * @param {string} token - WPay Token
 * @returns {Promise} 用户列表数据
 */
export const setWPayMerchantToken = async (id, token) => {
  const response = await axiosInstance.post(`/users/setWPayMerchantToken`, { id, merchant_token: token })
  return response.data
}

