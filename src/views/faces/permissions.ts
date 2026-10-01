import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

export interface FaceSharingSettings {
  publiclyVisible: boolean
  allowRemix: boolean
}
export async function updateFaceSharing(appId: number, settings: Partial<FaceSharingSettings>): Promise<FaceSharingSettings> {
  const result: ApiResponse<FaceSharingSettings> = await instance.patch(`/dsn/products/${appId}/face-sharing`, settings, { suppressForbiddenRedirect: true })
  if (!result.data) throw new Error('Could not save sharing settings. Please try again.')
  return result.data
}
export async function remixFace(designUid: string): Promise<string> {
  const result: ApiResponse<{ designUid: string }> = await instance.post('/dsn/design/create-by-copy', { uid: designUid }, { suppressForbiddenRedirect: true })
  if (!result.data?.designUid) throw new Error('Could not create a copy. Please try again.')
  return result.data.designUid
}
