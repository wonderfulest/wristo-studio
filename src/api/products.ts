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

export interface ProductSyncStep {
  key: 'downloads' | 'purchases' | 'search' | 'china'
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'
  message: string | null
}
export interface ProductSyncJob {
  id: string
  appId: number
  status: 'running' | 'succeeded' | 'failed'
  steps: ProductSyncStep[]
  startedAt: number
}
export const startProductSync = (appId: number): Promise<ApiResponse<ProductSyncJob>> =>
  instance.post(`/dsn/products/${appId}/sync`)
export const getProductSync = (appId: number, id = 'latest'): Promise<ApiResponse<ProductSyncJob | null>> =>
  instance.get(`/dsn/products/${appId}/sync/${id}`)
