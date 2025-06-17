import axiosInstance from '@/config/axiosConfigStrapi'

/**
 * 获取字体列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 当前页码
 * @param {number} params.pageSize - 每页数量
 * @param {string} params.name - 字体名称筛选
 * @param {string} params.status - 字体状态筛选
 * @returns {Promise} 字体列表数据
 */
export const getFonts = async ({ page, pageSize, name, status }) => {
  const params = {
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
    'sort[0]': 'updatedAt:desc',
    'populate': '*' // 获取关联的文件信息
  }

  if (name) {
    params['filters[name][$contains]'] = name
  }
  if (status) {
    params['filters[status][$eq]'] = status
  }

  const response = await axiosInstance.get('/super-fonts', { params })
  return response.data
}

/**
 * 获取字体详情
 * @param {string} id - 字体ID
 * @returns {Promise} 字体详情数据
 */
export const getFontDetail = async (id) => {
  const response = await axiosInstance.get(`/super-fonts/${id}`, {
    params: {
      populate: '*'
    }
  })
  return response.data
}

/**
 * 获取字体详情
 * @param {string} slug - 字体标识
 * @returns {Promise} 字体详情数据
 */
export const getFontBySlug = async (slug) => {
  const response = await axiosInstance.get(`/super-fonts?filters[slug][$eq]=${slug}`, {
    params: {
      populate: '*'
    }
  })
  return response.data[0]
}

/**
 * 上传字体文件
 * @param {File} file - TTF文件
 * @returns {Promise} 上传结果
 */
export const uploadFontFile = async (file) => {
  const formData = new FormData()
  formData.append('files', file, file.name)
  const response = await axiosInstance.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data[0]
}

/**
 * 创建新字体
 * @param {Object} data - 字体数据
 * @param {string} data.name - 字体名称
 * @param {string} data.slug - 字体标识
 * @param {string} data.family - 字体族名称
 * @param {string} data.status - 字体状态：Submitted, Approved, Rejected
 * @param {number} data.ttf - 字体文件ID
 * @returns {Promise} 创建结果
 */
export const createFont = async (data) => {
  if (data.status != 'Submitted') {
    throw new Error('字体状态错误')
  }
  const response = await axiosInstance.post('/super-fonts', {
    data: {
      name: data.name,
      slug: data.slug,
      family: data.family,
      status: data.status,
      ttf: data.ttf
    }
  })
  return response.data
}


/**
 * 更新字体信息
 * @param {string} id - 字体ID
 * @param {Object} data - 更新数据
 * @returns {Promise} 更新结果
 */
export const updateFont = async (id, data) => {
  const response = await axiosInstance.put(`/super-fonts/${id}`, {
    data
  })
  return response.data
}

/**
 * 删除字体
 * @param {string} id - 字体ID
 * @returns {Promise} 删除结果
 */
export const deleteFont = async (id) => {
  const response = await axiosInstance.delete(`/super-fonts/${id}`)
  return response.data
}
