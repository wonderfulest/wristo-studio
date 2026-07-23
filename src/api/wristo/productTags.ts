import instance from '@/config/axios'
import type { ProductTagPageResponse } from '@/types/api/productTag'

export const getProductTagsPage = (): Promise<ProductTagPageResponse> => {
  return instance.get('/dsn/product-tags/page', {
    params: {
      pageNum: 1,
      pageSize: 200,
      orderBy: 'sort:desc',
    },
  })
}
