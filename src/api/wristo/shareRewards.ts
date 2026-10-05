import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

export interface ShareRewardProfile {
  code: string
  enabled: boolean
  creditsPerVisit: number
  minimumVisibleSeconds: number
  userDailyCredits: number
  earnedToday: number
}
export async function loadShareRewardProfile(): Promise<ShareRewardProfile> {
  const result: ApiResponse<ShareRewardProfile> = await instance.get('/user/studio-credits/share')
  if (result.code !== 0 || !result.data) throw new Error('Could not prepare your personal sharing link. Please try again.')
  return result.data
}
