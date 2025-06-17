import axiosInstance from '@/config/axiosConfigStrapi'

// 收藏/取消收藏
export const toggleFavorite = async (name, designId, userId, isActive) => {
  const response = await axiosInstance.post('/design-favorites/toggle', {
    data: {
      name: name,
      design: designId,
      users_permissions_user: userId,
      isActive: isActive
    }
  })
  return response.data
}

// 获取收藏列表
export const getFavorites = async ({ page, pageSize, userId }) => {
  const params = {
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
    'sort[0]': 'createdAt:desc',
    'populate': '*',  // 获取关联的设计信息
    'filters[users_permissions_user][id][$eq]': userId, // 添加用户过滤
    'filters[isActive][$eq]': true // 添加isActive过滤
  }
  
  const response = await axiosInstance.get('/design-favorites', {
    params
  })
  return response.data
}

// 删除收藏
export const deleteFavorite = async (documentId) => {
  const response = await axiosInstance.delete(`/design-favorites/${documentId}`)
  return response.data
}