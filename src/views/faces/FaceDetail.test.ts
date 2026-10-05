// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FaceDetail from './FaceDetail.vue'
import { loadShareRewardProfile } from '@/api/wristo/shareRewards'
vi.mock('@/api/wristo/shareRewards', () => ({ loadShareRewardProfile: vi.fn() }))
import { updateFaceSharing, remixFace } from './permissions'
const auth = vi.hoisted(() => ({ isAdminUser: false, isAuthenticated: false, userInfo: { id: 7 } as { id: number } | null }))
vi.mock('@/stores/theme', () => ({ useThemeStore: () => ({ currentTheme: 'light' }) }))
vi.mock('@/stores/user', () => ({ useUserStore: () => auth }))
vi.mock('./permissions', () => ({ updateFaceSharing: vi.fn(), remixFace: vi.fn() }))
import { loadFaceDetail, type FaceDetail as FaceDetailData } from './catalog'

vi.mock('@/components/layout/GlobalHeader.vue', () => ({ default: { template: '<header>Public navigation</header>' } }))
vi.mock('./catalog', async () => ({ ...await vi.importActual<any>('./catalog'), loadFaceDetail: vi.fn() }))
const fixture = { appId: 123, ownerId: 7, publiclyVisible: false, allowRemix: false, name: 'Test face', designId: 'actual-design', price: 0, description: '<script>unsafe()</script>', devices: [], previewImageUrl: '/test.png' }
const wrappers: ReturnType<typeof mount>[] = []
beforeEach(() => { auth.isAuthenticated = false; vi.mocked(loadShareRewardProfile).mockReset(); auth.isAdminUser = false; auth.userInfo = { id: 7 }; vi.mocked(updateFaceSharing).mockReset(); vi.mocked(remixFace).mockReset(); vi.mocked(loadFaceDetail).mockReset().mockResolvedValue({ ...fixture }) })
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
  it('opens the Facebook preparation dialog instead of navigating away', async () => {
    HTMLDialogElement.prototype.showModal = vi.fn()
    HTMLDialogElement.prototype.close = vi.fn()
    const { wrapper, router } = await setup()
    await wrapper.findAll('button[aria-haspopup="dialog"]').find(button => button.text() === 'Facebook')!.trigger('click'); await flushPromises()
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled()
    expect((wrapper.get('dialog textarea').element as HTMLTextAreaElement).value).toContain('Test face')
    expect(router.currentRoute.value.path).toBe('/faces/123')
    await wrapper.get('dialog .close').trigger('click')
    expect(wrapper.find('dialog').exists()).toBe(false)
  })
  it('shares the signed-in user code through caption, Facebook preview and copy link', async () => {
    auth.isAuthenticated = true
    vi.mocked(loadShareRewardProfile).mockResolvedValue({ code: 'abcdefgh12345678', enabled: true, creditsPerVisit: 1, minimumVisibleSeconds: 10, userDailyCredits: 20, earnedToday: 0 })
    HTMLDialogElement.prototype.showModal = vi.fn()
    HTMLDialogElement.prototype.close = vi.fn()
    const { wrapper } = await setup()
    await wrapper.findAll('button[aria-haspopup="dialog"]').find(button => button.text() === 'Facebook')!.trigger('click'); await flushPromises()
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toContain('?ref=abcdefgh12345678&via=Facebook')
    expect(new URL(wrapper.get('.link-only').attributes('href')).searchParams.get('u')).toContain('?ref=abcdefgh12345678&via=Facebook')
    await wrapper.get('dialog .close').trigger('click')
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
    await wrapper.get('.share-button:not([aria-haspopup])').trigger('click'); await flushPromises()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('?ref=abcdefgh12345678&via=copy'))
    expect(loadShareRewardProfile).toHaveBeenCalledTimes(1)
    Reflect.deleteProperty(navigator, 'clipboard')
  })
  it('does not silently share an untracked link when personal code loading fails', async () => {
    auth.isAuthenticated = true
    vi.mocked(loadShareRewardProfile).mockRejectedValue(new Error('Unavailable'))
    const { wrapper } = await setup()
    await wrapper.findAll('button[aria-haspopup="dialog"]').find(button => button.text() === 'X')!.trigger('click'); await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(wrapper.get('.share-row [role="status"]').text()).toContain('Could not prepare your personal sharing link')
  })
  it('lets an administrator edit another author’s app without remixing', async () => {
    auth.userInfo = { id: 8 }
    auth.isAdminUser = true
    const { wrapper, router } = await setup()
    expect(wrapper.find('input[type=file]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Edit description')
    const switches = wrapper.findAll('[role="switch"]')
    expect(switches).toHaveLength(2)
    vi.mocked(updateFaceSharing).mockResolvedValueOnce({ publiclyVisible: true, allowRemix: false })
    await switches[0].trigger('click'); await flushPromises()
    expect(switches[0].attributes('aria-checked')).toBe('true')
    await wrapper.get('a.primary-button').trigger('click'); await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/design?id=actual-design')
    expect(remixFace).not.toHaveBeenCalled()
  })
  it('does not allow a signed-in non-owner to edit', async () => {
    auth.userInfo = { id: 8 }
    const { wrapper } = await setup()
    expect(wrapper.find('.primary-button').exists()).toBe(false)
    expect(wrapper.find('[role="switch"]').exists()).toBe(false)
    expect(wrapper.find('input[type=file]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Edit description')
  })
  it('shows independent author controls and only applies successful saves', async () => {
    const { wrapper } = await setup()
    const switches = wrapper.findAll('[role="switch"]')
    expect(switches).toHaveLength(2)
    vi.mocked(updateFaceSharing).mockResolvedValueOnce({ publiclyVisible: true, allowRemix: false })
    await switches[0].trigger('click'); await flushPromises()
    expect(updateFaceSharing).toHaveBeenCalledWith(123, { publiclyVisible: true })
    expect(switches[0].attributes('aria-checked')).toBe('true')
    expect(switches[1].attributes('aria-checked')).toBe('false')
    vi.mocked(updateFaceSharing).mockRejectedValueOnce(new Error('Save failed'))
    await switches[1].trigger('click'); await flushPromises()
    expect(switches[1].attributes('aria-checked')).toBe('false')
    expect(wrapper.get('.sharing-error').text()).toContain('Save failed')
  })
  it('hides controls and editing from visitors when remix is disabled', async () => {
    auth.userInfo = null
    const { wrapper } = await setup()
    expect(wrapper.find('[role="switch"]').exists()).toBe(false)
    expect(wrapper.find('.primary-button').exists()).toBe(false)
    expect(wrapper.find('input[type=file]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Edit description')
  })
  it('creates a new design before opening the builder for a visitor', async () => {
    auth.userInfo = { id: 8 }
    vi.mocked(loadFaceDetail).mockResolvedValue({ ...fixture, allowRemix: true })
    vi.mocked(remixFace).mockResolvedValue('copied-design')
    const { wrapper, router } = await setup()
    expect(wrapper.find('[role="switch"]').exists()).toBe(false)
    await wrapper.get('button.primary-button').trigger('click'); await flushPromises()
    expect(remixFace).toHaveBeenCalledWith('actual-design')
    expect(router.currentRoute.value.fullPath).toBe('/design?id=copied-design')
  })
  it('shows supported data fields and hides the card for an app without configuration', async () => {
    vi.mocked(loadFaceDetail).mockResolvedValue({ ...fixture, configJson: {
      dataOptions: { ':FIELD_TYPE_STEPS': { label: { eng: { long: 'Daily Steps' } } } },
    } })
    const { wrapper, router } = await setup()
    expect(wrapper.get('.supported-data-fields').text()).toContain('Supported data fields 1')
    expect(wrapper.get('.data-field-list li').text()).toBe('Daily Steps')
    vi.mocked(loadFaceDetail).mockResolvedValue({ ...fixture, appId: 456 })
    await router.push('/faces/456')
    await flushPromises()
    expect(wrapper.find('.supported-data-fields').exists()).toBe(false)
  })
  it('opens the actual design and renders untrusted descriptions as text', async () => {
    const { wrapper, router } = await setup()
    expect(wrapper.get('h1').text()).toBe('Test face')
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.get('.description').text()).toBe(fixture.description)
    await wrapper.get('a.primary-button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/design?id=actual-design')
  })
  it('renders Markdown formatting while rejecting HTML and unsafe links', async () => {
    vi.mocked(loadFaceDetail).mockResolvedValue({ ...fixture, description: '## Heading\n\n**Bold**\n\n[unsafe](javascript:alert(1))\n\n<img src=x onerror=alert(1)>' })
    const { wrapper } = await setup()
    expect(wrapper.get('.description h2').text()).toBe('Heading')
    expect(wrapper.get('.description strong').text()).toBe('Bold')
    expect(wrapper.find('.description img').exists()).toBe(false)
    expect(wrapper.find('.description a[href^="javascript:"]').exists()).toBe(false)
  })
  it('does not offer an editor link when there is no design source', async () => {
    vi.mocked(loadFaceDetail).mockResolvedValue({ ...fixture, designId: null })
    const { wrapper } = await setup()
    expect(wrapper.find('a.primary-button').exists()).toBe(false)
    expect(wrapper.text()).toContain('not available in the builder')
  })
  it('offers guided sharing for every platform and resets on navigation', async () => {
    HTMLDialogElement.prototype.showModal = vi.fn()
    HTMLDialogElement.prototype.close = vi.fn()
    const { wrapper, router } = await setup()
    const buttons = wrapper.findAll('.share-row button[aria-haspopup="dialog"]')
    expect(buttons.map(button => button.text())).toEqual(['X', 'Facebook', 'Reddit'])
    for (const button of buttons) {
      await button.trigger('click')
      expect(wrapper.get('dialog .eyebrow').text()).toBe(button.text())
      await wrapper.get('.close').trigger('click')
    }
    await buttons[0].trigger('click')
    vi.mocked(loadFaceDetail).mockResolvedValue({ ...fixture, appId: 456, name: 'Second & face' })
    await router.push('/faces/456?tracking=private#preview')
    await flushPromises()
    expect(wrapper.find('dialog').exists()).toBe(false)
    await buttons[0].trigger('click')
    expect(wrapper.get('textarea').element.value).toContain('/faces/456')
  })
  it('copies the detail link and reports clipboard failure', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const { wrapper } = await setup()
    await wrapper.get('.share-button:not([aria-haspopup])').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith(new URL('/faces/123', window.location.origin).href)
    expect(wrapper.get('.share-row [role="status"]').text()).toBe('Link copied')
    writeText.mockRejectedValueOnce(new Error('Denied'))
    await wrapper.get('.share-button:not([aria-haspopup])').trigger('click')
    await flushPromises()
    expect(wrapper.get('.share-row [role="status"]').text()).toContain('Could not copy')
    Reflect.deleteProperty(navigator, 'clipboard')
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
