import type { ApiResponse } from './api'

export interface ProductTag {
  id: number
  name: string
  slug: string
  tagGroup: string
  sort: number
  status: number
  description: string
  appCount: number
  createdAt: string
  updatedAt: string
}

export interface ProductTagPageData {
  pageNum: number
  pageSize: number
  total: number
  pages: number
  list: ProductTag[]
  meta?: Record<string, unknown>
}

export type ProductTagPageResponse = ApiResponse<ProductTagPageData>
