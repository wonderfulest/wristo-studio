import type { Product } from './product'
import type { Image } from './image'
import type { UserBase } from './user'
import type { DesignStatus, DesignConfig, Payment, DesignPageParams } from './design'

export interface ApiResponse<T> {
  code: number
  msg: string
  data?: T
}

export interface PageResponse<T> {
  pageNum: number
  pageSize: number
  total: number
  pages: number
  list: T[]
}
