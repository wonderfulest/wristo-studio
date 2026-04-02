import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
import type { Product } from '@/types/api/product'

export const getProduct = (appId: number): Promise<ApiResponse<Product>> => {
  return instance.get(`/dsn/products/get-by-appid/${appId}`)
}
