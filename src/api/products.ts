import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
import type { Product } from '@/types/api/product'

export const getProduct = (appId: number): Promise<ApiResponse<Product>> => {
  return instance.get(`/dsn/products/get-by-appid/${appId}`)
}

export const rebuildSearchIndex = (appId: number): Promise<ApiResponse<boolean>> =>
  instance.post(`/admin/products/watchface-search/rebuild/${appId}`)

export const getSearchIndexDoc = (appId: number): Promise<ApiResponse<{ id: number } | null>> =>
  instance.get(`/admin/products/watchface-search/doc/${appId}`)
