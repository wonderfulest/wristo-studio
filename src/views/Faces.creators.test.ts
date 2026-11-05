// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { expect, it, vi } from 'vitest'
import Faces from './Faces.vue'
import { loadFaces } from './faces/catalog'
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ userInfo: null, isAdminUser: false }) }))
vi.mock('@/components/layout/GlobalHeader.vue', () => ({ default: { template: '<header />' } }))
vi.mock('./faces/catalog', async () => ({
  ...await vi.importActual<any>('./faces/catalog'),
  loadFaceDevices: vi.fn().mockResolvedValue([]),
  loadFaces: vi.fn().mockResolvedValue({ total: 26, pages: 2, list: [{ appId: 1, name: 'Alpha', price: 0, creator: { name: 'Alice', avatar: '/alice.png' } }] }),
}))
it('toggles creator details without refetching and restores the browser preference', async () => {
  localStorage.clear()
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/faces', component: Faces }] })
  await router.push('/faces')
  const mountPage = () => mount(Faces, { global: { plugins: [router] } })
  let wrapper = mountPage()
  await flushPromises()
  expect(wrapper.find('.face-creator').exists()).toBe(false)
  const calls = vi.mocked(loadFaces).mock.calls.length
  await wrapper.get('input[role="switch"]').setValue(true)
  expect(wrapper.get('.face-creator').text()).toBe('Alice')
  expect(wrapper.get('.creator-avatar img').attributes('src')).toBe('/alice.png')
  expect(loadFaces).toHaveBeenCalledTimes(calls)
  wrapper.unmount()
  wrapper = mountPage()
  await flushPromises()
  expect(wrapper.find('.face-creator').exists()).toBe(true)
  await wrapper.get('input[role="switch"]').setValue(false)
  expect(wrapper.find('.face-creator').exists()).toBe(false)
  wrapper.unmount()
  localStorage.clear()
})
