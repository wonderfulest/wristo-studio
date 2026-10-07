import { afterEach, describe, expect, it, vi } from 'vitest'
import { directAssetUpload } from './directAssetUpload'

class FakeXHR {
  static last: FakeXHR
  constructor() { FakeXHR.last = this }
  upload: { onprogress?: (event: any) => void } = {}
  status = 200
  withCredentials = true
  open = vi.fn()
  setRequestHeader = vi.fn()
  send = vi.fn()
  onload?: () => void
  onerror?: () => void
  onabort?: () => void
  abort = vi.fn(() => this.onabort?.())
}
afterEach(() => { vi.unstubAllGlobals() })
describe('direct asset upload', () => {
  it('reports measured bytes without credentials and does not treat upload progress as server success', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXHR)
    const progress = vi.fn()
    const controller = new AbortController()
    const promise = directAssetUpload('https://storage.example', {} as File, { 'Content-Type': 'application/zip' }, controller.signal, progress)
    const xhr = FakeXHR.last
    expect(xhr.withCredentials).toBe(false)
    expect(xhr.open).toHaveBeenCalledWith('PUT', 'https://storage.example')
    expect(xhr.setRequestHeader.mock.calls).toEqual([['Content-Type', 'application/zip']])
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 })
    expect(progress).toHaveBeenCalledWith(50)
    xhr.status = 403; xhr.onload?.()
    await expect(promise).resolves.toEqual({ ok: false, status: 403 })
    controller.abort()
    expect(xhr.abort).not.toHaveBeenCalled()
  })
  it('aborts the transfer on timeout', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXHR)
    const controller = new AbortController()
    const promise = directAssetUpload('url', {} as File, {}, controller.signal, vi.fn())
    controller.abort()
    await expect(promise).rejects.toThrow('Upload aborted')
  })
})
