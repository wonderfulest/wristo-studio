import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

export type CreditType = 'REGISTRATION_GIFT' | 'AI_TAGS' | 'AI_DESCRIPTION' | 'AI_BANNER'
export interface CreditEntry {
  id: string
  type: CreditType
  delta: number
  balanceAfter: number
  productId: string | null
  createdAt: string
}
export interface CreditPage { items: CreditEntry[]; total: number; page: number; pageSize: number }
export const studioCreditsApi = {
  balance(): Promise<ApiResponse<{ balance: number }>> { return instance.get('/user/studio-credits') },
  history(page: number, type: CreditType | ''): Promise<ApiResponse<CreditPage>> {
    return instance.get('/user/studio-credits/history', { params: { page, pageSize: 20, type: type || undefined } })
  },
}
