// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import UserMenu from './UserMenu.vue'

const auth = vi.hoisted(() => ({
  isAuthenticated: true, isStudioConsumer: true, isMerchantUser: false, isAdminUser: false,
  userInfo: { id: 7, nickname: 'Matilda', premium: { active: true, lifetime: true, expiresAt: null } },
  studioMembership: { level: 'free', status: null },
}))
vi.mock('@/stores/user', () => ({ useUserStore: () => auth }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
vi.mock('@/stores/pendingGoLive', () => ({ usePendingGoLiveStore: () => ({ count: 0, setItems: vi.fn(), fetch: vi.fn() }) }))
vi.mock('@/api/wristo/tickets', () => ({ ticketsApi: { count: vi.fn() } }))
vi.mock('@/utils/ssoRedirect', () => ({ cancelPendingSsoRedirect: vi.fn(), clearLocalAuthState: vi.fn(), redirectToSsoLogin: vi.fn() }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('./StudioCredits.vue', () => ({ default: { template: '<span />' } }))
vi.mock('@/components/dialogs/DesignerDefaultConfigDialog.vue', () => ({ default: { template: '<span />' } }))

describe('Premium avatar badge', () => {
  it.each([true, false])('shows the badge for active Premium (lifetime: %s) with free Studio membership', (lifetime) => {
    auth.userInfo.premium = { active: true, lifetime, expiresAt: null }
    const wrapper = mount(UserMenu, { global: { stubs: { Icon: true, DesignerDefaultConfigDialog: true } } })
    expect(wrapper.find('.premium-badge').exists()).toBe(true)
    wrapper.unmount()
  })
  it('does not show the badge for inactive Premium and free Studio membership', () => {
    auth.userInfo.premium.active = false
    const wrapper = mount(UserMenu, { global: { stubs: { Icon: true, DesignerDefaultConfigDialog: true } } })
    expect(wrapper.find('.premium-badge').exists()).toBe(false)
    wrapper.unmount()
  })
})
