// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import Faces from './Faces.vue'
const auth = vi.hoisted(() => ({ userInfo: { id: 7 } as { id: number } | null, isAdminUser: false }))
vi.mock('@/stores/user', () => ({ useUserStore: () => auth }))
vi.mock('@/components/layout/GlobalHeader.vue', () => ({ default: { template: '<header />' } }))
vi.mock('./faces/catalog', async () => ({
  ...await vi.importActual<any>('./faces/catalog'),
  loadFaceDevices: vi.fn().mockResolvedValue([]),
  loadFaces: vi.fn().mockResolvedValue({ total: 3, pages: 1, list: [
    { appId: 1, ownerId: 7, designId: 'mine', name: 'Mine', price: 0 },
    { appId: 2, ownerId: 8, designId: 'other', name: 'Other', price: 0 },
    { appId: 3, ownerId: 7, name: 'No source', price: 0 },
  ] }),
}))
describe('catalog edit actions', () => {
  it.each([
    ['owner', { id: 7 }, false, ['Mine']],
    ['admin', { id: 9 }, true, ['Mine', 'Other']],
    ['visitor', null, false, []],
    ['other user', { id: 9 }, false, []],
  ] as const)('shows only editable designs for %s', async (_, user, admin, links) => {
    auth.userInfo = user
    auth.isAdminUser = admin
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/faces', component: Faces }, { path: '/:pathMatch(.*)*', component: { template: '<div />' } },
    ] })
    await router.push('/faces')
    const wrapper = mount(Faces, { global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.findAll('.face-card').filter(card => card.find('.face-editable').exists()).map(card => card.get('.face-name').text())).toEqual(links)
    wrapper.unmount()
  })
})
