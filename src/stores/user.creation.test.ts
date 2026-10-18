import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { useUserStore } from './user'
vi.hoisted(() => vi.stubGlobal('localStorage', { getItem: () => null }))
vi.mock('@/api/wristo/auth', () => ({ getUserInfo: vi.fn(), logout: vi.fn(), updateMyInfo: vi.fn() }))
describe('unlimited design creation', () => {
  it('allows free users to create despite cached quota values without granting premium access', () => {
    setActivePinia(createPinia())
    const user = useUserStore()
    user.$patch({ userInfo: { roles: [], studioMembership: {
      level: 'free', maxDesigns: 1, designCount: 10001, canCreateDesign: false,
      canUsePremiumAssets: false,
    } } } as any)
    expect(user.canCreateDesign).toBe(true)
    expect(user.canUsePremiumStudioAssets).toBe(false)
  })
})
