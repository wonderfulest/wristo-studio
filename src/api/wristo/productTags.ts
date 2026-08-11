import instance from '@/config/axios'
import type { ProductTagPageResponse } from '@/types/api/productTag'

export const getProductTagsPage = async (): Promise<ProductTagPageResponse> => {
  const pageSize = 50
  const firstResponse = await instance.get('/dsn/product-tags/page', {
    params: { pageNum: 1, pageSize, orderBy: 'sort:desc' },
  }) as unknown as ProductTagPageResponse
  if (firstResponse.code !== 0 || !firstResponse.data) return firstResponse

  const tags = [...firstResponse.data.list]
  const pages = Math.max(1, firstResponse.data.pages || 1)

  for (let pageNum = 2; pageNum <= pages; pageNum += 1) {
    const response = await instance.get('/dsn/product-tags/page', {
      params: { pageNum, pageSize, orderBy: 'sort:desc' },
    }) as unknown as ProductTagPageResponse
    if (response.code !== 0 || !response.data) return response
    tags.push(...response.data.list)
  }

  return {
    ...firstResponse,
    data: {
      ...firstResponse.data,
      pageSize,
      list: tags,
    },
  }
}
