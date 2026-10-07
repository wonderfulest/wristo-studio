import { directAssetUpload } from './directAssetUpload'
import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
import type { DesignAssetBundleVO } from './design'

export type DesignUploadProgress = {
  stage: 'ticket' | 'uploading' | 'queued' | 'processing' | 'saved'
  percent?: number
}

interface UploadTicket {
  taskId: string
  uploadUrl: string
  headers: Record<string, string>
  expiresInSeconds: number
}

interface UploadStatus {
  taskId: string
  status: 'UPLOADING' | 'QUEUED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED'
  error?: string
  result?: DesignAssetBundleVO
}

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

function data<T>(response: ApiResponse<T>): T {
  if (response.code !== 0 || !response.data) throw new Error(response.msg || 'Project save request failed')
  return response.data
}

/** Raw fetch deliberately bypasses the API interceptor: never send Wristo credentials to S3. */
export async function uploadDesignAssetBundle(
  designUid: string,
  file: File,
  onProgress?: (progress: DesignUploadProgress) => void,
): Promise<ApiResponse<DesignAssetBundleVO>> {
  if (!file.size || file.size > 128 * 1024 * 1024) throw new Error('Project must be between 1 byte and 128 MiB')
  const base = `/dsn/design/${encodeURIComponent(designUid)}/asset-uploads`
  onProgress?.({ stage: 'ticket' })
  const ticket = data(await instance.post<never, ApiResponse<UploadTicket>>(base, {
    filename: file.name,
    size: file.size,
  }))
  // A new ticket creates a unique staging key; retry only that same upload, at most three times.
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5 * 60_000)
    try {
      onProgress?.({ stage: 'uploading' })
      const response = onProgress
        ? await directAssetUpload(ticket.uploadUrl, file, ticket.headers, controller.signal,
          percent => onProgress({ stage: 'uploading', percent }))
        : await fetch(ticket.uploadUrl, {
        method: 'PUT', body: file, headers: ticket.headers, credentials: 'omit', signal: controller.signal,
      })
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          throw new UploadRejectedError('Upload was rejected or expired. Please save again.')
        }
        throw new Error('Upload could not finish. Please try again.')
      }
      break
    } catch (error) {
      if (error instanceof UploadRejectedError || attempt >= 2) throw error
      await delay(1000 * (attempt + 1))
    } finally {
      clearTimeout(timeout)
    }
  }

  const taskUrl = `${base}/${encodeURIComponent(ticket.taskId)}`
  // Completion is idempotent, so a lost HTTP response can safely be retried.
  let state: UploadStatus | undefined
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      state = data(await instance.post<never, ApiResponse<UploadStatus>>(`${taskUrl}/complete`))
      break
    } catch (error) {
      if (attempt === 2) throw new Error('Upload finished, but save status could not be confirmed. Reload the project before saving again.')
      await delay(1000 * (attempt + 1))
    }
  }
  const deadline = Date.now() + 15 * 60_000
  let failures = 0
  while (Date.now() < deadline) {
    if (state?.status === 'SUCCEEDED' && state.result) {
      onProgress?.({ stage: 'saved' })
      return { code: 0, msg: 'success', data: state.result }
    }
    if (state?.status === 'FAILED') throw new Error(state.error || 'Project processing failed. Please save again.')
    onProgress?.({ stage: state?.status === 'PROCESSING' ? 'processing' : 'queued' })
    await delay(2000)
    try {
      state = data(await instance.get<never, ApiResponse<UploadStatus>>(taskUrl))
      failures = 0
    } catch {
      if (++failures >= 5) throw new Error('Unable to check save status. The server may still be processing; reload the project before saving again.')
    }
  }
  throw new Error('The server is still processing this save. Reload the project to check its latest saved version.')
}

class UploadRejectedError extends Error {}
