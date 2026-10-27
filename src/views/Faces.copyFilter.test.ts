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
  loadFaces: vi.fn().mockResolvedValue({ total: 26, pages: 2, list: [{ appId: 1, name: 'Alpha', price: 0 }] }),
}))
it('resets pagination on copy filter changes and clears the filter with Browse all faces', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/faces', component: Faces }] })
  await router.push('/faces')
  const wrapper = mount(Faces, { global: { plugins: [router] } })
  await flushPromises()
  expect(loadFaces).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, allowRemix: undefined }))
  expect((wrapper.findAll('.filters select')[1].element as HTMLSelectElement).value).toBe('')
  await wrapper.findAll('.pagination button')[1].trigger('click')
  await flushPromises()
  expect(loadFaces).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
  const filter = wrapper.findAll('.filters select')[1]
  await filter.setValue('true')
  await flushPromises()
  expect(loadFaces).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, allowRemix: true }))
  vi.mocked(loadFaces).mockResolvedValueOnce({ total: 0, pages: 0, list: [] })
  await filter.setValue('false')
  await flushPromises()
  expect(loadFaces).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, allowRemix: false }))
  await wrapper.get('.empty button').trigger('click')
  await flushPromises()
  expect(loadFaces).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, allowRemix: undefined }))
  expect((filter.element as HTMLSelectElement).value).toBe('')
  wrapper.unmount()
})
