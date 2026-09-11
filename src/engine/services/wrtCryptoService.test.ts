import { beforeEach, describe, expect, it, vi } from 'vitest'
import { decryptWrtFileIfNeeded, encryptWrtFile } from './wrtCryptoService'

const { post } = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('@/config/axios', () => ({ default: { post } }))

beforeEach(() => { post.mockReset() })
describe('encrypted WRT transport', () => {
  it('keeps legacy files offline', async () => {
    const file = new File(['PK legacy'], 'old.wrt')
    expect(await decryptWrtFileIfNeeded(file)).toBe(file)
    expect(post).not.toHaveBeenCalled()
  })
  it('encrypts via authenticated API and keeps filename', async () => {
    post.mockResolvedValue({ code: 0, data: btoa('WRTENC01encrypted') })
    const file = await encryptWrtFile(new File(['PK source'], 'design.wrt'))
    expect(file.name).toBe('design.wrt')
    expect(await file.text()).toBe('WRTENC01encrypted')
    expect(post.mock.calls[0][0]).toBe('/api/dsn/wrt/encrypt')
  })
  it('decrypts recognized files before parsing', async () => {
    post.mockResolvedValue({ code: 0, data: btoa('PK source') })
    const file = await decryptWrtFileIfNeeded(new File(['WRTENC01encrypted'], 'design.wrt'))
    expect(await file.text()).toBe('PK source')
    expect(post.mock.calls[0][0]).toBe('/api/dsn/wrt/decrypt')
  })
  it('never falls back to plaintext after encryption failure', async () => {
    post.mockRejectedValue(new Error('unavailable'))
    await expect(encryptWrtFile(new File(['PK'], 'design.wrt'))).rejects.toThrow('unavailable')
    post.mockResolvedValue({ code: 0, data: btoa('PK plaintext') })
    await expect(encryptWrtFile(new File(['PK'], 'design.wrt'))).rejects.toThrow('encrypted WRT')
  })
  it('propagates decryption rejection without legacy fallback', async () => {
    post.mockRejectedValue(new Error('forbidden'))
    await expect(decryptWrtFileIfNeeded(new File(['WRTENC01encrypted'], 'design.wrt'))).rejects.toThrow('forbidden')
  })
})
