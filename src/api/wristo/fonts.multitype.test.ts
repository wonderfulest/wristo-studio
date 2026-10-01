// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/config/axios', () => ({ default: { get, post } }))

import { getRecentFonts } from './fonts'

describe('multi-type font query client', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('serializes repeated type parameters for recent fonts', async () => {
    await getRecentFonts(5, undefined, 42, ['time_font', 'text_font'])

    expect(get).toHaveBeenCalledWith(
      '/dsn/fonts/recent?limit=5&user_id=42&types=time_font&types=text_font&populate=ttf%2Cuser',
    )
  })
})
