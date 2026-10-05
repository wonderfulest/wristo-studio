import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

export type AdjustmentFields = Record<string, string | number>
export interface AdjustmentElement { id: string; eleType: string; fields: AdjustmentFields; context: Record<string, string | number | boolean | null> }
export interface AdjustmentResult { summary: string; changes: { id: string; patch: AdjustmentFields }[] }
export interface AdjustmentRequest {
  projectId: string; prompt: string; width: number; height: number; expectedCreditCost: number
  elements: AdjustmentElement[]; selectedIds: string[]; history: { prompt: string; summary: string }[]
}
export interface AdjustmentJob {
  id: string; projectId: string; status: 'queued' | 'running' | 'succeeded' | 'refund_pending' | 'failed'
  creditCost: number; createdAt: string; result: AdjustmentResult | null
}
export const aiAdjustmentApi = {
  start(id: string, request: AdjustmentRequest): Promise<ApiResponse<AdjustmentJob>> {
    return instance.post('/dsn/studio-ai/adjustments', request, { headers: { 'X-AI-Request-Id': id } })
  },
  status(id: string): Promise<ApiResponse<AdjustmentJob>> { return instance.get(`/dsn/studio-ai/adjustments/${id}`) },
}
