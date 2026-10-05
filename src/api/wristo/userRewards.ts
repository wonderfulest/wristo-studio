import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
export interface UserRewardSettings {
  checkInEnabled: boolean
  checkInCredits: number
  purchaseEnabled: boolean
  purchaseCredits: number
  downloadEnabled: boolean
  downloadCredits: number
  downloadDailyLimit: number
}
export interface UserRewardProgress {
  settings: UserRewardSettings
  day: string
  checkedIn: boolean
  downloadCreditsToday: number
  purchasesRewarded: number
  downloadsRewarded: number
}
const path = '/user/studio-credits/tasks'
export const userRewardsApi = {
  progress(): Promise<ApiResponse<UserRewardProgress>> { return instance.get(path) },
  checkIn(): Promise<ApiResponse<UserRewardProgress>> { return instance.post(`${path}/check-in`) },
}
