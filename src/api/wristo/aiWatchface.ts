import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
export interface WatchfaceJob {
  id: string
  status: 'queued' | 'running' | 'succeeded' | 'refund_pending' | 'failed'
  creditCost: number
  createdAt: string
}
export const isWatchfacePending = (job?: WatchfaceJob) => !!job && ['queued', 'running', 'refund_pending'].includes(job.status)
export const aiWatchfaceApi = {
  start(requestId: string, prompt: string, width: number, height: number, expectedCreditCost: number, referenceImage?: string): Promise<ApiResponse<WatchfaceJob>> {
    return instance.post('/dsn/studio-ai/watchfaces', { prompt, width, height, expectedCreditCost, referenceImage }, { headers: { 'X-AI-Request-Id': requestId } })
  },
  list(): Promise<ApiResponse<WatchfaceJob[]>> { return instance.get('/dsn/studio-ai/watchfaces') },
  status(id: string): Promise<ApiResponse<WatchfaceJob>> { return instance.get(`/dsn/studio-ai/watchfaces/${encodeURIComponent(id)}`) },
  async file(id: string): Promise<File> {
    const result = await instance.get<unknown, ApiResponse<string>>(`/dsn/studio-ai/watchfaces/${encodeURIComponent(id)}/file`, { timeout: 120000 })
    if (result.code !== 0 || typeof result.data !== 'string') throw new Error('Unable to download the generated watch face')
    const raw = atob(result.data)
    return new File([Uint8Array.from(raw, c => c.charCodeAt(0))], 'ai-watchface.wrt', { type: 'application/vnd.wristo.design-package+zip' })
  },
}
