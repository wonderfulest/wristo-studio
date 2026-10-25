import { beforeEach, describe, expect, it } from 'vitest'
import { restoreProgress } from './model'
import { onboarding, startOnboarding, savedOnboardingDesign, submittedOnboardingBuild, observeOnboardingDesign, downloadedOnboardingPrg, completeOnboarding, pauseOnboarding } from './progress'
const design = (task = 2, status = 'completed', release = 2, device = 'venu3') => ({ designUid: 'first', product: { prgPackagingLog: { id: task, deviceId: device, packagingStatus: status }, prgRelease: { id: release, deviceId: device, prgUrl: '/first.prg' } } } as any)
beforeEach(() => { startOnboarding('first'); onboarding.latest = null })
describe('first design progress', () => {
  it('restores interrupted work paused and rejects corrupt or old storage', () => {
    expect(restoreProgress(JSON.stringify(onboarding.progress)).status).toBe('paused')
    expect(restoreProgress('{').status).toBe('idle')
    expect(restoreProgress('{"version":0}').status).toBe('idle')
  })
  it('only advances a successful save for the guided design', () => {
    onboarding.progress.step = 'save'
    savedOnboardingDesign('other'); expect(onboarding.progress.step).toBe('save')
    savedOnboardingDesign('first'); expect(onboarding.progress.step).toBe('detail')
  })
  it('ignores historical builds, wrong devices and downloading another release', () => {
    onboarding.progress.step = 'detail'
    observeOnboardingDesign(design(1, 'completed', 1), 'venu3')
    submittedOnboardingBuild('first', 'venu3')
    observeOnboardingDesign(design(1, 'completed', 1), 'venu3')
    observeOnboardingDesign(design(2, 'completed', 2, 'fr965'), 'fr965')
    expect(onboarding.progress.step).toBe('build')
    observeOnboardingDesign(design(), 'venu3')
    expect(onboarding.progress.step).toBe('download')
    downloadedOnboardingPrg('first', 1); expect(onboarding.progress.step).toBe('download')
    downloadedOnboardingPrg('first', 2); expect(onboarding.progress.step).toBe('install')
    completeOnboarding(); expect(onboarding.progress.status).toBe('completed')
  })
  it('keeps failures retryable and never treats submission as completion', () => {
    onboarding.progress.step = 'build'
    submittedOnboardingBuild('first', 'venu3')
    observeOnboardingDesign(design(2, 'processing'), 'venu3'); expect(onboarding.progress.step).toBe('build')
    observeOnboardingDesign(design(2, 'failed'), 'venu3'); expect(onboarding.progress.submittedAt).toBe(0)
    submittedOnboardingBuild('first', 'venu3')
    observeOnboardingDesign(design(3, 'completed', 3), 'venu3'); expect(onboarding.progress.step).toBe('download')
  })
  it('does not progress while paused', () => {
    onboarding.progress.step = 'save'; pauseOnboarding(); savedOnboardingDesign('first')
    expect(onboarding.progress.step).toBe('save')
    completeOnboarding(); expect(onboarding.progress.status).toBe('paused')
  })
})

it('revalidates a removed build artifact before allowing download after resume', () => {
  onboarding.progress.step = 'build'
  submittedOnboardingBuild('first', 'venu3'); observeOnboardingDesign(design(), 'venu3')
  expect(onboarding.progress.step).toBe('download')
  observeOnboardingDesign({ designUid: 'first' } as any, 'venu3')
  expect(onboarding.progress.step).toBe('build')
  downloadedOnboardingPrg('first', 2); expect(onboarding.progress.step).toBe('build')
})
