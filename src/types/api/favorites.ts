export interface ToggleFavoriteParams {
  name: string
  designId: string | number
  userId: string | number
  isActive: boolean
}

export interface GetFavoritesParams {
  page: number
  pageSize: number
  userId: string | number
}

export interface DeleteFavoriteParams {
  documentId: string | number
}

export type FavoritesResponse = any
export type ToggleFavoriteResponse = any
export type DeleteFavoriteResponse = any
