// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount as mountComponent, type VueWrapper } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({ requirePremium: vi.fn(), push: vi.fn() }))
vi.mock('@/composables/useStudioMembershipGate', () => ({ useStudioMembershipGate: () => ({ requirePremium: mocks.requirePremium }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key === 'bitmapMaker.create' ? 'Create Bitmap Font' : key }) }))

import BitmapFontMakerEntry from './BitmapFontMakerEntry.vue'

const wrappers: VueWrapper[] = []
const mount = ((...args: Parameters<typeof mountComponent>) => {
  const wrapper = mountComponent(...args)
  wrappers.push(wrapper)
  return wrapper
}) as typeof mountComponent
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()) })

describe('BitmapFontMakerEntry', () => {
  beforeEach(() => { vi.clearAllMocks() })
  it('blocks non-Premium navigation through the existing membership gate', async () => {
    mocks.requirePremium.mockReturnValue(false)
    const wrapper = mount(BitmapFontMakerEntry)
    await wrapper.get('button').trigger('click')
    expect(mocks.requirePremium).toHaveBeenCalledWith('font.uploadRequiresPremium')
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('navigates Premium users to the named maker route', async () => {
    mocks.requirePremium.mockReturnValue(true)
    const wrapper = mount(BitmapFontMakerEntry)
    await wrapper.get('button').trigger('click')
    expect(mocks.push).toHaveBeenCalledWith({ name: 'BitmapFontMaker', query: { source: 'ttf' } })
  })
})
