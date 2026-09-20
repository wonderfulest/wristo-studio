import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const { post, get } = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }))
vi.mock('@/config/axios', () => ({ default: { post, get } }))
import { uploadDesignAssetBundle } from './designAssetUpload'

const file = { name: 'project.wrt', size: 10 } as File
const result = { designUid: 'design-1', url: 'https://cdn.example/project.zip', hash: 'abc', size: 10, version: 4 }
const ok = (data: unknown) => ({ code: 0, data })
const ticket = { taskId: 'task-1', uploadUrl: 'https://s3.example/upload', headers: { 'Content-Type': 'application/zip' }, expiresInSeconds: 900 }

beforeEach(() => {
  vi.useFakeTimers()
  post.mockReset(); get.mockReset()
  post.mockResolvedValueOnce(ok(ticket)).mockResolvedValue(ok({ status: 'QUEUED' }))
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('direct upload and asynchronous save', () => {
  it('sends raw bytes without API credentials and waits for published result', async () => {
    get.mockResolvedValueOnce(ok({ status: 'PROCESSING' })).mockResolvedValueOnce(ok({ status: 'SUCCEEDED', result }))
    const promise = uploadDesignAssetBundle('design-1', file)
    const assertion = expect(promise).resolves.toMatchObject({ code: 0, data: result })
    await vi.runAllTimersAsync()
    await assertion
    expect(fetch).toHaveBeenCalledWith(ticket.uploadUrl, expect.objectContaining({ body: file, credentials: 'omit', headers: ticket.headers, method: 'PUT' }))
    expect(post.mock.calls[0]).toEqual(['/dsn/design/design-1/asset-uploads', { filename: file.name, size: file.size }])
    expect(post.mock.calls[1][0]).toBe('/dsn/design/design-1/asset-uploads/task-1/complete')
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('reports validation failure instead of save success', async () => {
    get.mockResolvedValue(ok({ status: 'FAILED', error: 'Invalid WRT package' }))
    const assertion = expect(uploadDesignAssetBundle('id', file)).rejects.toThrow('Invalid WRT package')
    await vi.runAllTimersAsync(); await assertion
  })

  it('retries a lost completion response without another file upload', async () => {
    post.mockReset().mockResolvedValueOnce(ok(ticket)).mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(ok({ status: 'SUCCEEDED', result }))
    const assertion = expect(uploadDesignAssetBundle('id', file)).resolves.toMatchObject({ data: result })
    await vi.runAllTimersAsync(); await assertion
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledTimes(3)
  })

  it('does not queue rejected direct uploads', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 403 } as Response)
    const assertion = expect(uploadDesignAssetBundle('id', file)).rejects.toThrow('rejected or expired')
    await vi.runAllTimersAsync(); await assertion
    expect(post).toHaveBeenCalledTimes(1)
    expect(get).not.toHaveBeenCalled()
  })

  it('tolerates a transient polling failure', async () => {
    get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(ok({ status: 'SUCCEEDED', result }))
    const assertion = expect(uploadDesignAssetBundle('id', file)).resolves.toMatchObject({ data: result })
    await vi.runAllTimersAsync(); await assertion
  })

  it('does not request a ticket for an oversized file', async () => {
    await expect(uploadDesignAssetBundle('id', { ...file, size: 128 * 1024 * 1024 + 1 } as File)).rejects.toThrow('128 MiB')
    expect(post).not.toHaveBeenCalled()
  })
})
