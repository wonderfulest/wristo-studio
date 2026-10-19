import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { useUserStore } from './user'
vi.hoisted(() => vi.stubGlobal('localStorage', { getItem: () => null }))
vi.mock('@/api/wristo/auth', () => ({ getUserInfo: vi.fn(), logout: vi.fn(), updateMyInfo: vi.fn() }))
describe('role-based design quota', () => {
  it('blocks creation at the server quota without granting premium access', () => {
    setActivePinia(createPinia())
    const user = useUserStore()
    user.$patch({ userInfo: { roles: [], studioMembership: {
      level: 'free', maxDesigns: 3, designCount: 10001, canCreateDesign: false,
      canUsePremiumAssets: false,
    } } } as any)
    expect(user.canCreateDesign).toBe(false)
    expect(user.canUsePremiumStudioAssets).toBe(false)
  })
  it('allows purchased capacity and unlimited paid membership', () => {
    setActivePinia(createPinia())
    const user = useUserStore()
    for (const membership of [
      { level: 'free', maxDesigns: 4, designCount: 3, extraDesignSlots: 1, canCreateDesign: true },
      { level: 'annual', maxDesigns: null, designCount: 10001, canCreateDesign: true },
    ]) {
      user.$patch({ userInfo: { roles: [], studioMembership: membership } } as any)
      expect(user.canCreateDesign).toBe(true)
    }
  })
})
