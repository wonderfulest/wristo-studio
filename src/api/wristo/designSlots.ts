import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
export interface SlotPack { code: string; slots: number; creditCost: number; priceCents: number; currency: string; creditsAvailable: boolean; available: boolean }
export interface SlotCatalog { packs: SlotPack[] }
export interface SlotOrder { id: string; packageCode: string; slots: number; priceCents: number; currency: string; transactionId: string | null; status: string; refundedSlots: number; createdAt: string }
export const designSlotsApi = {
  catalog: (): Promise<ApiResponse<SlotCatalog>> => instance.get('/user/design-slots'),
  redeem: (requestId: string, expectedCost: number, packageCode: string): Promise<ApiResponse<number>> => instance.post('/user/design-slots/redeem', { requestId, expectedCost, packageCode }),
  create: (requestId: string, expectedPriceCents: number, packageCode: string): Promise<ApiResponse<SlotOrder>> => instance.post('/user/design-slots/orders', { requestId, expectedPriceCents, packageCode }),
  orders: (): Promise<ApiResponse<SlotOrder[]>> => instance.get('/user/design-slots/orders'),
  sync: (id: string): Promise<ApiResponse<SlotOrder>> => instance.post(`/user/design-slots/orders/${encodeURIComponent(id)}/sync`),
}
