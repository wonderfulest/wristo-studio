import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
export interface SlotCatalog { creditCost: number; priceCents: number; currency: string; creditsAvailable: boolean; available: boolean }
export interface SlotOrder { id: string; slots: number; priceCents: number; currency: string; transactionId: string | null; status: string; refundedSlots: number; createdAt: string }
export const designSlotsApi = {
  catalog: (): Promise<ApiResponse<SlotCatalog>> => instance.get('/user/design-slots'),
  redeem: (requestId: string, expectedCost: number): Promise<ApiResponse<number>> => instance.post('/user/design-slots/redeem', { requestId, expectedCost }),
  create: (requestId: string, expectedPriceCents: number): Promise<ApiResponse<SlotOrder>> => instance.post('/user/design-slots/orders', { requestId, expectedPriceCents }),
  orders: (): Promise<ApiResponse<SlotOrder[]>> => instance.get('/user/design-slots/orders'),
  sync: (id: string): Promise<ApiResponse<SlotOrder>> => instance.post(`/user/design-slots/orders/${encodeURIComponent(id)}/sync`),
}
