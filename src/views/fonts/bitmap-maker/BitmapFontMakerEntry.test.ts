// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({ requirePremium: vi.fn(), push: vi.fn() }))
vi.mock('@/composables/useStudioMembershipGate', () => ({ useStudioMembershipGate: () => ({ requirePremium: mocks.requirePremium }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key === 'bitmapMaker.create' ? 'Create Bitmap Font' : key }) }))

import BitmapFontMakerEntry from './BitmapFontMakerEntry.vue'

describe('BitmapFontMakerEntry', () => {
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
