export type Step = 'create' | 'time' | 'save' | 'detail' | 'build' | 'download' | 'install' | 'done'
export const steps: Step[] = ['create', 'time', 'save', 'detail', 'build', 'download', 'install', 'done']
export interface Progress {
  version: 1
  status: 'idle' | 'active' | 'paused' | 'dismissed' | 'completed'
  step: Step
  designId: string
  deviceId: string
  submittedAt: number
  baselineTaskId?: number
  baselineReleaseId?: number
  taskId?: number
  releaseId?: number
}
export const freshProgress = (): Progress => ({ version: 1, status: 'idle', step: 'create', designId: '', deviceId: '', submittedAt: 0 })
export function restoreProgress(raw: string | null): Progress {
  try {
    const value = JSON.parse(raw || 'null')
    if (value?.version !== 1 || !steps.includes(value.step) || !['idle', 'active', 'paused', 'dismissed', 'completed'].includes(value.status)
      || typeof value.designId !== 'string' || typeof value.deviceId !== 'string' || typeof value.submittedAt !== 'number') return freshProgress()
    return { ...freshProgress(), ...value, status: value.status === 'active' ? 'paused' : value.status }
  } catch { return freshProgress() }
}
