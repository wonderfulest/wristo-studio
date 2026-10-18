import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

export interface DesignSharingSettings {
  publiclyVisible: boolean
  allowRemix: boolean
}

const path = (uid: string) => `/dsn/design/${encodeURIComponent(uid)}/sharing`
const options = { suppressForbiddenRedirect: true }
const unwrap = (result: ApiResponse<DesignSharingSettings>) => {
  if (result.code !== 0 || !result.data) throw new Error(result.msg || 'Could not load or save sharing settings.')
  return result.data
}
export async function getDesignSharing(uid: string): Promise<DesignSharingSettings> {
  return unwrap(await instance.get(path(uid), options))
}
export async function updateDesignSharing(uid: string, settings: Partial<DesignSharingSettings>): Promise<DesignSharingSettings> {
  return unwrap(await instance.patch(path(uid), settings, options))
}
