/** Raw XHR allows byte progress without the API client's auth interceptors. */
export function directAssetUpload(
  url: string, file: File, headers: Record<string, string>, signal: AbortSignal,
  onProgress: (percent: number) => void,
): Promise<{ ok: boolean; status: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const cleanup = () => signal.removeEventListener('abort', abort)
    const abort = () => xhr.abort()
    xhr.open('PUT', url)
    xhr.withCredentials = false
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value)
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && event.total > 0) onProgress(Math.min(100, 100 * event.loaded / event.total))
    }
    xhr.onload = () => { cleanup(); resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status }) }
    xhr.onerror = () => { cleanup(); reject(new Error('Upload network error')) }
    xhr.onabort = () => { cleanup(); reject(new DOMException('Upload aborted', 'AbortError')) }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) { cleanup(); reject(new DOMException('Upload aborted', 'AbortError')); return }
    try { xhr.send(file) } catch (error) { cleanup(); reject(error) }
  })
}
