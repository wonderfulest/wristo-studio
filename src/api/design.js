import axiosInstance from '@/config/axiosConfigStrapi'

/**
 * 创建或更新设计
 * @param {Object} data - 设计数据
 * @returns {Promise} 设计数据
 */
export const createOrUpdateDesign = async (data) => {
  const response = await axiosInstance.post('/designs/createOrUpdate', { data })
  return response.data
}

/**
 * 获取设计详情
 * @param {string} id - 设计ID
 * @returns {Promise} 设计详情数据
 */
export const getDesign = async (id) => {
  const response = await axiosInstance.get(`/designs/${id}`)
  return response.data
}

/**
 * 更新设计
 * @param {string} documentId - 设计ID
 * @param {Object} data - 设计数据
 * @returns {Promise} 更新结果
 */
export const updateDesign = async (documentId, data) => {
  const response = await axiosInstance.put(`/designs/${documentId}`, { data })
  return response.data
}

/**
 * 获取设计列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 当前页码
 * @param {number} params.pageSize - 每页数量
 * @param {string} params.userId - 用户ID
 * @param {string} params.status - 状态筛选
 * @param {string} params.name - 名称筛选
 * @param {string} params.sort - 排序参数
 * @returns {Promise} 设计列表数据
 */
export const getDesigns = async ({ page, pageSize, userId, status, name, sort }) => {
  const params = {
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
    'filters[userId][$eq]': userId,
    'populate': '*',
    'sort': sort
  }
  if (userId == 1) { // 超级权限用户可以查看所有用户的设计
    delete params['filters[userId][$eq]']
  }
  if (status) {
    params['filters[designStatus][$eq]'] = status
  }
  if (name) {
    params['filters[name][$contains]'] = name
  }
  const response = await axiosInstance.get('/designs/getDesigns', { params })
  console.log('response', response)
  return response.data
}

/**
 * 获取设计列表
 * @param {Array} productIds - 产品ID列表
 * @returns {Promise} 设计列表数据
 */
export const getDesignsByProductIds = async (productIds) => {
  const response = await axiosInstance.get('/designs', {
    params: {
      populate: 'screenshot',
      'filters[kpay_product_id][$in]': productIds
    }
  })
  return response.data
}

/**
 * 更新设计状态
 * @param {string} documentId - 设计ID
 * @param {string} status - 新状态
 * @returns {Promise} 更新结果
 */
export const updateDesignStatus = async (documentId, status) => {
  const response = await axiosInstance.put(`/designs/${documentId}`, {
    data: {
      designStatus: status
    }
  })
  return response.data
}

/**
 * 删除设计
 * @param {string} id - 设计ID
 * @returns {Promise} 删除结果
 */
export const deleteDesign = async (id) => {
  const response = await axiosInstance.delete(`/designs/${id}`)
  return response.data
}
