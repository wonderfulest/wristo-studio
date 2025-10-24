
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

// 通用分页查询入参，对应后端 PageRequest
export interface PageQueryDTO {
  pageNum?: number
  pageSize?: number
  orderBy?: string
  populate?: string
}
