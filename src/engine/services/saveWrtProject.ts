import type { DesignUploadProgress } from '@/api/wristo/designAssetUpload'
import type { RuntimeDesignConfig } from '@/types/app/config'
import { designApi } from '@/api/wristo/design'
import { buildWrtDesignPackage } from './designAssetBundleService'
import { migrateWeekdayTokens } from '@/engine/expression/weekdayTokenMigration'

export type SaveWrtProgress = {
  stage: 'assets' | 'fonts' | 'compressing' | DesignUploadProgress['stage']
  percent?: number
}

/** The server publishes package bytes and the embedded config in one update. */
export async function saveWrtProject(
  designUid: string,
  config: RuntimeDesignConfig,
  options: Parameters<typeof buildWrtDesignPackage>[1] & { onSaveProgress?: (progress: SaveWrtProgress) => void } = {},
) {
  if (!designUid) throw new Error('A design ID is required to save a project')
  const started = performance.now()
  let stageStarted = started
  let stage = 'preparing'
  let packageBytes = 0
  const timings: Record<string, number> = {}
  const report = (progress: SaveWrtProgress) => {
    if (progress.stage !== stage) {
      const now = performance.now()
      timings[stage] = (timings[stage] || 0) + now - stageStarted
      stageStarted = now
      stage = progress.stage
    }
    options.onSaveProgress?.(progress)
  }
  let succeeded = false
  try {
    const file = await buildWrtDesignPackage(migrateWeekdayTokens({ ...config, designId: designUid }), {
      ...options,
      onStage: (stage, percent) => {
        options.onStage?.(stage, percent)
        report({ stage, percent })
      },
    })
    packageBytes = file.size
    const response = await designApi.uploadAssetBundle(designUid, file, report)
    if (response.code !== 0 || !response.data) throw new Error(response.msg || 'Failed to save WRT project')
    succeeded = true
    return response.data
  } finally {
    const now = performance.now()
    timings[stage] = (timings[stage] || 0) + now - stageStarted
    // No URLs, credentials, design content or user identifiers in diagnostics.
    console.info('[WRT save]', { succeeded, packageBytes, totalMs: Math.round(now - started),
      stagesMs: Object.fromEntries(Object.entries(timings).map(([key, value]) => [key, Math.round(value)])) })
  }
}
