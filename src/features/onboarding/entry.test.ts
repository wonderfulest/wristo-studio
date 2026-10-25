// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'
import { enterWatchFaceGuide } from './entry'
import { onboarding, setOnboardingOwner, startOnboarding } from './progress'
import { guardStudioRoute, requiresStudioLogin } from '@/auth/studioAccess'

beforeEach(() => { localStorage.clear(); setOnboardingOwner('') })

it('starts explicitly even for accounts that previously dismissed the guide', () => {
  setOnboardingOwner('7')
  onboarding.progress.status = 'dismissed'
  expect(enterWatchFaceGuide('7')).toEqual({ path: '/design', query: {} })
  expect(onboarding.progress.status).toBe('active')
  expect(onboarding.progress.designId).toBe('')
  expect(onboarding.launchRequested).toBe(true)
})

it.each(['time', 'save', 'build', 'download', 'install'] as const)('resumes persisted %s without creating a design', step => {
  setOnboardingOwner('7'); startOnboarding('my-design')
  Object.assign(onboarding.progress, { step, deviceId: 'venu3', submittedAt: 42, releaseId: 8 })
  setOnboardingOwner('')
  const target = enterWatchFaceGuide('7')
  expect(target).toEqual(step === 'install' ? '/prg-installer' : ['build', 'download'].includes(step) ? '/designs/my-design' : { path: '/design', query: { id: 'my-design' } })
  expect(onboarding.progress).toMatchObject({ status: 'active', step, designId: 'my-design', submittedAt: 42, releaseId: 8 })
})

it('does not reuse another account’s progress', () => {
  setOnboardingOwner('7'); startOnboarding('private-design')
  enterWatchFaceGuide('8')
  expect(onboarding.progress.designId).toBe('')
  expect(onboarding.owner).toBe('8')
})

it('starts a fresh guide after completion', () => {
  setOnboardingOwner('7'); startOnboarding('completed-design')
  Object.assign(onboarding.progress, { status: 'completed', step: 'done' })
  enterWatchFaceGuide('7')
  expect(onboarding.progress).toMatchObject({ status: 'active', step: 'create', designId: '' })
})

it('preserves the guide entry and language through the login redirect', () => {
  let redirect = ''
  expect(requiresStudioLogin('/create-watch-face')).toBe(true)
  expect(guardStudioRoute({ requiresAuth: true, isAuthenticated: false, hasAccess: true, fullPath: '/create-watch-face?lang=zh', redirectToLogin: path => { redirect = path }, rejectForbidden: () => '/forbidden' })).toBe(false)
  expect(redirect).toBe('/create-watch-face?lang=zh')
})
