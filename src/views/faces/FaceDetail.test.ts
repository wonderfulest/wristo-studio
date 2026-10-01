// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FaceDetail from './FaceDetail.vue'
import { loadFaceDetail, type FaceDetail as FaceDetailData } from './catalog'

vi.mock('@/components/layout/GlobalHeader.vue', () => ({ default: { template: '<header>Public navigation</header>' } }))
vi.mock('./catalog', async () => ({ ...await vi.importActual<any>('./catalog'), loadFaceDetail: vi.fn() }))
const fixture = { appId: 123, name: 'Test face', designId: 'actual-design', price: 0, description: '<script>unsafe()</script>', devices: [], previewImageUrl: '/test.png' }
const wrappers: ReturnType<typeof mount>[] = []
beforeEach(() => { vi.mocked(loadFaceDetail).mockReset().mockResolvedValue(fixture) })
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()) })
async function setup() {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/faces/:appId', component: FaceDetail },
    { path: '/faces', component: { template: '<div>Gallery</div>' } },
    { path: '/design', component: { template: '<div>Editor</div>' } },
  ] })
  await router.push('/faces/123')
  const wrapper = mount(FaceDetail, { global: { plugins: [router], stubs: { Icon: true } } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}
describe('watch face details', () => {
  it('opens the actual design and renders untrusted descriptions as text', async () => {
    const { wrapper, router } = await setup()
    expect(wrapper.get('h1').text()).toBe('Test face')
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.get('.description').text()).toBe(fixture.description)
    await wrapper.get('a.primary-button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/design?id=actual-design')
  })
  it('does not offer an editor link when there is no design source', async () => {
    vi.mocked(loadFaceDetail).mockResolvedValue({ ...fixture, designId: null })
    const { wrapper } = await setup()
    expect(wrapper.find('a.primary-button').exists()).toBe(false)
    expect(wrapper.text()).toContain('not available in the builder')
  })
  it('shows errors and retries', async () => {
    vi.mocked(loadFaceDetail).mockRejectedValueOnce(new Error('Offline'))
    const { wrapper } = await setup()
    expect(wrapper.get('[role="alert"]').text()).toContain('Offline')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Test face')
  })
  it('ignores a stale response after changing apps', async () => {
    let finish!: (value: any) => void
    vi.mocked(loadFaceDetail).mockImplementationOnce(() => new Promise<FaceDetailData>(resolve => { finish = resolve }))
    const { wrapper, router } = await setup()
    vi.mocked(loadFaceDetail).mockResolvedValue({ ...fixture, appId: 456, name: 'Second face', designId: 'second' })
    await router.push('/faces/456')
    await flushPromises()
    finish(fixture)
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Second face')
    expect(wrapper.get('a.primary-button').attributes('href')).toBe('/design?id=second')
  })
})
