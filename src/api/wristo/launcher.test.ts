import { beforeEach, describe, expect, it, vi } from 'vitest'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('@/config/axios', () => ({ default: { post } }))

import { buildLauncherDeepLink, createLauncherTicket, createLauncherTicketCache } from './launcher'

describe('Studio launcher client', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('creates a ticket for the selected PRG release', async () => {
    post.mockResolvedValue({
      code: 0,
      msg: 'success',
      data: { ticket: 'abcdefghijklmnopqrstuvwxyz_1234567890-ABCDE', expiresInSeconds: 300 },
    })

    await expect(createLauncherTicket(123)).resolves.toEqual({
      ticket: 'abcdefghijklmnopqrstuvwxyz_1234567890-ABCDE',
      expiresInSeconds: 300,
    })
    expect(post).toHaveBeenCalledWith('/dsn/products/launcher/tickets', { releaseId: 123 })
  })

  it('builds only the native launchers supported ticket deep link', () => {
    expect(buildLauncherDeepLink('abcdefghijklmnopqrstuvwxyz_1234567890-ABCDE')).toBe(
      'wristo-ciq://run?ticket=abcdefghijklmnopqrstuvwxyz_1234567890-ABCDE',
    )
    expect(() => buildLauncherDeepLink('short')).toThrow('Invalid launcher ticket')
    expect(() => buildLauncherDeepLink('abcdefghijklmnopqrstuvwxyz123456/unsafe')).toThrow(
      'Invalid launcher ticket',
    )
  })

  it('rejects a successful envelope that does not contain a ticket payload', async () => {
    post.mockResolvedValue({ code: 0, msg: 'success' })

    await expect(createLauncherTicket(123)).rejects.toThrow('Launcher ticket response is missing')
  })

  it('prepares a ticket before click and consumes it synchronously once', async () => {
    const createTicket = vi.fn().mockResolvedValue({
      ticket: 'abcdefghijklmnopqrstuvwxyz_1234567890-ABCDE',
      expiresInSeconds: 300,
    })
    const cache = createLauncherTicketCache(createTicket, () => 1_000)

    await cache.prepare(9)

    expect(createTicket).toHaveBeenCalledWith(9)
    expect(cache.take(9)).toBe('abcdefghijklmnopqrstuvwxyz_1234567890-ABCDE')
    expect(cache.take(9)).toBeUndefined()
  })
})
