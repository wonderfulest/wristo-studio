// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { describe, it, expect, vi, afterEach } from 'vitest'
import AuthorProfile from './AuthorProfile.vue'
import { loadAuthorProfile } from './catalog'
vi.mock('./catalog', async () => ({ ...await vi.importActual<object>('./catalog'), loadAuthorProfile: vi.fn() }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ locale: { value: 'zh' } }) }))
vi.mock('@/components/layout/GlobalHeader.vue', () => ({ default: { template: '<header />' } }))
const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.resetAllMocks() })
async function setup() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/authors/:userId', component: AuthorProfile }, { path: '/faces/:appId?', component: { template: '<div />' } }] })
  await router.push('/authors/7')
  const wrapper = mount(AuthorProfile, { global: { plugins: [router] } }); wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}
const profile = { id: 7, name: 'Maisie', works: { list: [{ appId: 123, name: 'Pixel Tank', price: 0 }], total: 25, pages: 2 } }
describe('creator public profile', () => {
  it('shows creator and public works and navigates pages', async () => {
    vi.mocked(loadAuthorProfile).mockResolvedValue(profile)
    const { wrapper, router } = await setup()
    expect(wrapper.text()).toContain('Maisie')
    expect(wrapper.text()).toContain('25 件公开作品')
    expect(wrapper.get('a[href="/faces/123"]').text()).toContain('Pixel Tank')
    await wrapper.findAll('button').at(-1)!.trigger('click'); await flushPromises()
    expect(router.currentRoute.value.query.page).toBe('2')
    expect(loadAuthorProfile).toHaveBeenLastCalledWith('7', 2)
  })
  it('shows empty state', async () => {
    vi.mocked(loadAuthorProfile).mockResolvedValue({ ...profile, works: { list: [], pages: 0, total: 0 } })
    const { wrapper } = await setup(); expect(wrapper.text()).toContain('暂时没有公开作品')
  })
  it('retries failed requests', async () => {
    vi.mocked(loadAuthorProfile).mockRejectedValueOnce(new Error('unavailable')).mockResolvedValue(profile)
    const { wrapper } = await setup(); expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    await wrapper.get('button').trigger('click'); await flushPromises()
    expect(wrapper.text()).toContain('Maisie')
  })
})
