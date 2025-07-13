export interface Category {
  id: number
  name: string
  slug: string
  sort: number
}

export interface CategoryPageQuery {
  pageNum: number
  pageSize: number
  orderBy?: string
}

export interface CategoryPageData {
  pageNum: number
  pageSize: number
  total: number
  pages: number
  list: Category[]
}

export interface CreateCategoryDto {
  name: string
  slug: string
  image?: string
  sort?: number
} 