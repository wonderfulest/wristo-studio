import { designApi } from '@/api/wristo/design'
import { isJsonProject, withJsonProjectResources } from './jsonProject'
import { saveWrtProject } from './saveWrtProject'
import type { RuntimeDesignConfig } from '@/types/app/config'

// Serialize access to the package registry used by the existing WRT exporter.
let pending: Promise<unknown> = Promise.resolve()
/** WRT is a build artifact. Generate it only for an explicit build/submission. */
export function prepareWrtBuild(designUid: string): Promise<void> {
  const run = pending.catch(() => {}).then(async () => {
    const response = await designApi.getDesignByUid(designUid)
    if (response.code !== 0 || !response.data) throw new Error(response.msg || 'Failed to read saved design')
    const design = response.data
    const config = design.configJson as unknown as RuntimeDesignConfig
    if (!isJsonProject(config)) return // Legacy designs already have a saved package.
    if (!Number.isInteger(design.version)) throw new Error('Saved design revision is missing; reload before building')
    await withJsonProjectResources(config, async () => {
      await saveWrtProject(designUid, { ...config, designId: designUid, name: design.name }, {
        previewDataUrl: design.cover?.url || undefined, expectedVersion: design.version,
      })
    })
  })
  pending = run
  return run
}
