import { reactive, watch } from 'vue'
import { freshProgress, restoreProgress } from './model'
import type { DesignListItem } from '@/types/api/design'
export const onboarding = reactive({ owner: '', launchRequested: false, progress: freshProgress(), createdId: '', offered: false, latest: null as DesignListItem | null })
const key = (owner: string) => `studio-first-design:v1:${owner}`
export function setOnboardingOwner(owner: string) {
  if (owner === onboarding.owner) return
  onboarding.owner = owner
  onboarding.launchRequested = false
  onboarding.latest = null
  onboarding.createdId = ''
  onboarding.offered = false
  let raw: string | null = null
  try { raw = owner ? localStorage.getItem(key(owner)) : null } catch { /* Browser storage may be unavailable. */ }
  onboarding.progress = restoreProgress(raw)
}
watch(() => onboarding.progress, value => {
  if (onboarding.owner) try { localStorage.setItem(key(onboarding.owner), JSON.stringify(value)) } catch { /* Continue in memory. */ }
}, { deep: true, flush: 'sync' })
export const isGuidedDesign = (id: string) => onboarding.progress.status === 'active' && onboarding.progress.designId === id
export function startOnboarding(id = '') {
  onboarding.progress = { ...freshProgress(), status: 'active', designId: id }
}
export function createdOnboardingDesign(id: string) {
  onboarding.createdId = id
  if (onboarding.progress.status === 'active' && onboarding.progress.step === 'create' && !onboarding.progress.designId) onboarding.progress.designId = id
}
export function savedOnboardingDesign(id: string) {
  if (isGuidedDesign(id) && onboarding.progress.step === 'save') onboarding.progress.step = 'detail'
}
export function submittedOnboardingBuild(id: string, deviceId: string) {
  const p = onboarding.progress
  if (!isGuidedDesign(id) || p.step !== 'build') return
  p.deviceId = deviceId
  p.baselineTaskId = onboarding.latest?.product?.prgPackagingLog?.id
  p.baselineReleaseId = onboarding.latest?.product?.prgRelease?.id
  p.submittedAt = Date.now()
  p.taskId = undefined
  p.releaseId = undefined
}
export function observeOnboardingDesign(design: DesignListItem, deviceId: string) {
  const p = onboarding.progress
  if (p.designId !== design.designUid) return
  onboarding.latest = design
  if (p.status !== 'active') return
  if (p.step === 'detail') p.step = 'build'
  if (!['build', 'download'].includes(p.step) || !p.submittedAt || deviceId !== p.deviceId) return
  const task = design.product?.prgPackagingLog
  const release = design.product?.prgRelease
  if (p.step === 'download' && (!task || task.id !== p.taskId || release?.id !== p.releaseId || !release?.prgUrl)) {
    p.step = 'build'; p.submittedAt = 0; p.releaseId = undefined
    return
  }
  if (task?.deviceId !== p.deviceId || task.id === p.baselineTaskId) return
  if (p.taskId && p.taskId !== task.id) { p.step = 'build'; p.submittedAt = 0; return }
  p.taskId = task.id
  if (['failed', 'cancelled', 'canceled'].includes(task.packagingStatus)) { p.step = 'build'; p.submittedAt = 0; return }
  if (['complete', 'completed'].includes(task.packagingStatus) && release?.deviceId === p.deviceId
    && release.id !== p.baselineReleaseId && release.prgUrl) {
    p.releaseId = release.id
    p.step = 'download'
  }
}
export function downloadedOnboardingPrg(id: string, releaseId: number) {
  const p = onboarding.progress
  if (isGuidedDesign(id) && p.step === 'download' && p.releaseId === releaseId) p.step = 'install'
}
export function pauseOnboarding() { onboarding.progress.status = 'paused' }
export function completeOnboarding() {
  if (onboarding.progress.status === 'active' && onboarding.progress.step === 'install') {
    onboarding.progress.step = 'done'; onboarding.progress.status = 'completed'
  }
}
