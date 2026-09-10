import type { RuntimeDesignConfig } from '@/types/app/config'
import { designApi } from '@/api/wristo/design'
import { buildWrtDesignPackage } from './designAssetBundleService'
import { migrateWeekdayTokens } from '@/engine/expression/weekdayTokenMigration'

/** The server publishes package bytes and the embedded config in one update. */
export async function saveWrtProject(
  designUid: string,
  config: RuntimeDesignConfig,
  options: Parameters<typeof buildWrtDesignPackage>[1] = {},
) {
  if (!designUid) throw new Error('A design ID is required to save a project')
  const file = await buildWrtDesignPackage(migrateWeekdayTokens({ ...config, designId: designUid }), options)
  const response = await designApi.uploadAssetBundle(designUid, file)
  if (response.code !== 0 || !response.data) throw new Error(response.msg || 'Failed to save WRT project')
  return response.data
}
