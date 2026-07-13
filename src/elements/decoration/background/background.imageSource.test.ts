import { beforeEach, describe, expect, it, vi } from 'vitest'

const getImageById = vi.fn()

vi.mock('@/api/image', () => ({
  getImageById,
}))

describe('resolveBackgroundImageSource', () => {
  beforeEach(() => {
    getImageById.mockReset()
  })

  it('prefers the CDN URL resolved from imageId over a restored blob URL', async () => {
    getImageById.mockResolvedValue({
      code: 0,
      data: {
        id: 39258,
        url: 'https://cdn.wristo.io/image/background.png',
      },
    })

    const { resolveBackgroundImageSource } = await import('./background.imageSource')
    const result = await resolveBackgroundImageSource({
      imageId: 39258,
      imageUrl: 'blob:https://studio.wristo.io/temporary',
    })

    expect(getImageById).toHaveBeenCalledWith(39258)
    expect(result).toBe('https://cdn.wristo.io/image/background.png')
  })

  it('falls back to imageUrl when imageId lookup fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    getImageById.mockRejectedValue(new Error('network error'))

    const { resolveBackgroundImageSource } = await import('./background.imageSource')
    const result = await resolveBackgroundImageSource({
      imageId: 39258,
      imageUrl: 'blob:https://studio.wristo.io/temporary',
    })

    expect(result).toBe('blob:https://studio.wristo.io/temporary')
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})
