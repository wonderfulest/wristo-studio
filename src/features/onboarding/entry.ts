import type { RouteLocationRaw } from 'vue-router'
import { onboarding, setOnboardingOwner, startOnboarding } from './progress'

// Resolve progress before mounting the editor, which creates a design on empty entry.
export function enterWatchFaceGuide(owner: string): RouteLocationRaw {
  setOnboardingOwner(owner)
  const p = onboarding.progress
  if (['active', 'paused'].includes(p.status) && p.designId && p.step !== 'done') {
    p.status = 'active'
  } else {
    startOnboarding()
  }
  onboarding.launchRequested = true
  const progress = onboarding.progress
  if (progress.step === 'install') return '/prg-installer'
  if (['detail', 'build', 'download'].includes(progress.step)) {
    return `/designs/${encodeURIComponent(progress.designId)}`
  }
  return { path: '/design', query: progress.designId ? { id: progress.designId } : {} }
}
