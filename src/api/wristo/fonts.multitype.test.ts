import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/config/axios', () => ({ default: { get, post } }))

import { getDesignerUsageFontsPage, getRecentFonts, searchFonts } from './fonts'

describe('multi-type font query client', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('posts both allowed types to search and usage pagination', async () => {
    const types = ['time_font', 'text_font']

    await searchFonts({ pageNum: 1, pageSize: 20, types })
    await getDesignerUsageFontsPage({ pageNum: 1, pageSize: 10, types })

    expect(post).toHaveBeenNthCalledWith(
      1,
      '/dsn/fonts/search?populate=ttf',
      { pageNum: 1, pageSize: 20, types },
    )
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/dsn/fonts/usage/page?populate=ttf',
      { pageNum: 1, pageSize: 10, types },
    )
  })

  it('serializes repeated type parameters for recent fonts', async () => {
    await getRecentFonts(5, undefined, 42, ['time_font', 'text_font'])

    expect(get).toHaveBeenCalledWith(
      '/dsn/fonts/recent?limit=5&user_id=42&types=time_font&types=text_font&populate=ttf%2Cuser',
    )
  })
})
