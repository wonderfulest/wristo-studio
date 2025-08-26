import axiosInstance from '@/config/axiosConfigStrapi'
import type {
  ToggleFavoriteParams,
  GetFavoritesParams,
  DeleteFavoriteParams,
  FavoritesResponse,
  ToggleFavoriteResponse,
  DeleteFavoriteResponse,
} from '@/types/api/favorites'

// 收藏/取消收藏
export const toggleFavorite = async (
  name: ToggleFavoriteParams['name'],
  designId: ToggleFavoriteParams['designId'],
  userId: ToggleFavoriteParams['userId'],
  isActive: ToggleFavoriteParams['isActive']
): Promise<ToggleFavoriteResponse> => {
  const response = await axiosInstance.post('/design-favorites/toggle', {
    data: {
      name,
      design: designId,
      users_permissions_user: userId,
      isActive,
    },
  })
  return response.data
}

// 获取收藏列表
export const getFavorites = async (
  { page, pageSize, userId }: GetFavoritesParams
): Promise<FavoritesResponse> => {
  const params = {
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
    'sort[0]': 'createdAt:desc',
    populate: '*', // 获取关联的设计信息
    'filters[users_permissions_user][id][$eq]': userId, // 添加用户过滤
    'filters[isActive][$eq]': true, // 添加isActive过滤
  } as Record<string, any>

  const response = await axiosInstance.get('/design-favorites', {
    params,
  })
  return response.data
}

// 删除收藏
export const deleteFavorite = async (
  documentId: DeleteFavoriteParams['documentId']
): Promise<DeleteFavoriteResponse> => {
  const response = await axiosInstance.delete(`/design-favorites/${documentId}`)
  return response.data
}
