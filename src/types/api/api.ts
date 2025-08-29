
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
