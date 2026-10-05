import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

export type CreditType = 'SHARE_VISIT_REWARD' | 'USER_CHECK_IN' | 'USER_DOWNLOAD' | 'USER_PURCHASE' | 'USER_PURCHASE_REFUND' | 'CREATOR_DOWNLOAD' | 'CREATOR_PURCHASE' | 'CREATOR_PURCHASE_REFUND' | 'PURCHASE' | 'PURCHASE_REFUND' | 'PURCHASE_REFUND_REVERSAL' | 'ADMIN_CREDIT' | 'ADMIN_DEBIT' | 'REGISTRATION_GIFT' | 'AI_TAGS' | 'AI_DESCRIPTION' | 'AI_BANNER' | 'AI_WATCHFACE' | 'AI_WATCHFACE_REFUND' | 'AI_WATCHFACE_ADJUST' | 'AI_WATCHFACE_ADJUST_REFUND'
export interface CreditEntry {
  id: string
  type: CreditType
  delta: number
  balanceAfter: number
  productId: string | null
  createdAt: string
}
export interface CreditPage { items: CreditEntry[]; total: number; page: number; pageSize: number }
export interface CreditPackage { code: string; name: string; credits: number; priceCents: number; currency: string; recommended: boolean; available: boolean }
export interface CreditOrder { id: string; packageCode: string; credits: number; priceCents: number; currency: string; transactionId: string | null; status: string; refundedCredits: number; createdAt: string }
export interface CreatorRewardProgress {
  pendingDownloads: number
  settings: { downloadEnabled: boolean; downloadsPerReward: number; downloadCredits: number; purchaseEnabled: boolean; purchaseCredits: number }
  lastSettledDay: string | null
}
export const studioCreditsApi = {
  creatorRewards(): Promise<ApiResponse<CreatorRewardProgress>> { return instance.get('/user/studio-credits/creator-rewards') },
  packages(): Promise<ApiResponse<CreditPackage[]>> { return instance.get('/user/studio-credits/packages') },
  orders(): Promise<ApiResponse<CreditOrder[]>> { return instance.get('/user/studio-credits/orders') },
  createOrder(packageCode: string, requestId: string): Promise<ApiResponse<CreditOrder>> { return instance.post('/user/studio-credits/orders', { packageCode, requestId }) },
  order(id: string): Promise<ApiResponse<CreditOrder>> { return instance.get(`/user/studio-credits/orders/${encodeURIComponent(id)}`) },
  syncOrder(id: string): Promise<ApiResponse<CreditOrder>> { return instance.post(`/user/studio-credits/orders/${encodeURIComponent(id)}/sync`) },
  balance(): Promise<ApiResponse<{ balance: number }>> { return instance.get('/user/studio-credits') },
  history(page: number, type: CreditType | ''): Promise<ApiResponse<CreditPage>> {
    return instance.get('/user/studio-credits/history', { params: { page, pageSize: 20, type: type || undefined } })
  },
}
