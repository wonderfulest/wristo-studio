import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
export interface DesignUnlockStatus { unlocked: boolean; canInstall: boolean; priceCents: number; currency: string; available: boolean }
export interface DesignUnlockOrder { id: string; designUid: string; transactionId: string | null; status: string }
const path = (uid: string) => `/user/design-unlocks/${encodeURIComponent(uid)}`
export const designUnlocksApi = {
  status: (uid: string): Promise<ApiResponse<DesignUnlockStatus>> => instance.get(path(uid)),
  orders: (uid: string): Promise<ApiResponse<DesignUnlockOrder[]>> => instance.get(`${path(uid)}/orders`),
  create: (uid: string, requestId: string, expectedPriceCents: number): Promise<ApiResponse<DesignUnlockOrder>> => instance.post(`${path(uid)}/orders`, { requestId, expectedPriceCents }),
  sync: (uid: string, id: string): Promise<ApiResponse<DesignUnlockOrder>> => instance.post(`${path(uid)}/orders/${encodeURIComponent(id)}/sync`),
}
