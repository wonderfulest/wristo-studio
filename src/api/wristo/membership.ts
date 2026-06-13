import { getUserInfo } from '@/api/wristo/auth'
import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
import type { UserInfo } from '@/types/user'
import type {
  StudioMembership,
  StudioMembershipCheckoutCallbackRequest,
  StudioMembershipCheckoutCallbackResponse,
  StudioMembershipPlan,
} from '@/types/api/membership'

export const membershipApi = {
  getStudioPlans(): Promise<ApiResponse<StudioMembershipPlan[]>> {
    return instance.get('/v1/studio/membership/plans')
  },
  getCurrent(): Promise<ApiResponse<StudioMembership>> {
    return instance.get('/v1/studio/membership/current')
  },
  cancelCurrent(): Promise<ApiResponse<StudioMembership>> {
    return instance.post('/v1/studio/membership/cancel')
  },
  resumeCurrent(): Promise<ApiResponse<StudioMembership>> {
    return instance.post('/v1/studio/membership/resume')
  },
  reconcileCheckout(data: StudioMembershipCheckoutCallbackRequest): Promise<ApiResponse<StudioMembershipCheckoutCallbackResponse>> {
    return instance.post('/public/purchase/callback', data)
  },
  async getCurrentStudioMembership(): Promise<ApiResponse<StudioMembership | null>> {
    const response = await getUserInfo()
    return {
      ...response,
      data: response.data?.studioMembership || null,
    } as ApiResponse<StudioMembership | null>
  },
}

export type StudioMembershipUserInfo = UserInfo & {
  studioMembership?: StudioMembership | null
}

export default membershipApi
