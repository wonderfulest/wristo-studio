// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FirstDesignGuide from './FirstDesignGuide.vue'
import { onboarding, createdOnboardingDesign, savedOnboardingDesign, observeOnboardingDesign, submittedOnboardingBuild, downloadedOnboardingPrg, setOnboardingOwner } from './progress'
const mocks = vi.hoisted(() => ({ user: null as any, base: null as any, elements: null as any, locale: null as any, cards: vi.fn(), detail: vi.fn() }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('@/stores/baseStore', () => ({ useBaseStore: () => mocks.base }))
vi.mock('@/stores/elementDataStore', () => ({ useElementDataStore: () => mocks.elements }))
vi.mock('@/stores/locale', () => ({ useLocaleStore: () => mocks.locale }))
vi.mock('@/api/wristo/design', () => ({ designApi: { getDesignCards: mocks.cards, getDesignByUid: mocks.detail } }))
let wrapper: ReturnType<typeof mount>
beforeEach(() => {
  localStorage.clear(); setOnboardingOwner(''); vi.clearAllMocks()
  mocks.user = reactive({ isAuthenticated: true, userInfo: { id: 7 }, editorDevice: { deviceId: 'venu3' } })
  mocks.base = reactive({ id: 'first', designLoading: true, watchFaceName: 'My first face' })
  mocks.elements = reactive({ elements: [] }); mocks.locale = reactive({ currentLocale: 'zh' })
  mocks.cards.mockResolvedValue({ code: 0, data: { total: 1, list: [{ designUid: 'first' }] } })
})
afterEach(() => { wrapper?.unmount(); document.querySelectorAll('[data-onboarding]').forEach(el => el.remove()); vi.useRealTimers() })
async function setup(path = '/design?id=first') {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }] })
  await router.push(path)
  wrapper = mount(FirstDesignGuide, { global: { plugins: [router] } })
  createdOnboardingDesign('first'); mocks.base.designLoading = false; await flushPromises()
  return router
}
async function click(label: string) {
  const button = wrapper.findAll('button').find(b => b.text() === label)
  expect(button, label).toBeDefined(); await button!.trigger('click'); await flushPromises()
}
describe('first design guide UI', () => {
  it('walks through the seven steps and requires explicit installation confirmation', async () => {
    const router = await setup()
    await click('创建我的第一个表盘'); await click('名称和设备已确认')
    expect(wrapper.text()).toContain('2 / 7')
    mocks.elements.elements = [{ eleType: 'date' }]; await flushPromises(); expect(onboarding.progress.step).toBe('time')
    mocks.elements.elements.push({ eleType: 'time' }); await flushPromises(); expect(wrapper.text()).toContain('3 / 7')
    savedOnboardingDesign('first'); await flushPromises(); await click('前往应用详情')
    expect(router.currentRoute.value.path).toBe('/designs/first')
    observeOnboardingDesign({ designUid: 'first' } as any, 'venu3'); await flushPromises()
    expect(wrapper.text()).toContain('5 / 7')
    submittedOnboardingBuild('first', 'venu3'); await flushPromises(); expect(wrapper.get('.guide-build-notice').text()).toContain('构建完成后，再来下载')
    expect(wrapper.text()).not.toContain('确认当前手表型号，点击')
    observeOnboardingDesign({ designUid: 'first', product: { prgPackagingLog: { id: 9, deviceId: 'venu3', packagingStatus: 'completed' }, prgRelease: { id: 4, deviceId: 'venu3', prgUrl: '/first.prg' } } } as any, 'venu3')
    await flushPromises(); expect(wrapper.text()).toContain('6 / 7'); expect(wrapper.find('.guide-build-notice').exists()).toBe(false)
    downloadedOnboardingPrg('first', 4); await flushPromises(); await click('打开安装指南')
    expect(router.currentRoute.value.path).toBe('/prg-installer'); expect(onboarding.progress.status).toBe('active')
    await click('已在手表上看到表盘'); expect(wrapper.text()).toContain('第一个表盘制作完成！')
  })
  it('goes back to adding time after undo and does not modify another project', async () => {
    const router = await setup(); await click('创建我的第一个表盘'); await click('名称和设备已确认')
    mocks.elements.elements = [{ eleType: 'time' }]; await flushPromises(); expect(onboarding.progress.step).toBe('save')
    mocks.elements.elements = []; await flushPromises(); expect(onboarding.progress.step).toBe('time')
    await router.push('/design?id=other'); mocks.base.id = 'other'; mocks.elements.elements = [{ eleType: 'time' }]
    await flushPromises(); expect(onboarding.progress.step).toBe('time'); expect(wrapper.text()).toContain('返回当前步骤')
  })
  it('does not auto-open for established users and keeps a manual entry', async () => {
    mocks.cards.mockResolvedValue({ code: 0, data: { total: 8, list: [] } }); await setup()
    expect(wrapper.find('[data-test="first-design-guide"]').exists()).toBe(false)
    await click('新手引导'); expect(wrapper.text()).toContain('创建我的第一个表盘')
  })
  it('persists pause, isolates accounts and resumes on reload', async () => {
    await setup(); await click('创建我的第一个表盘'); await click('名称和设备已确认'); await click('暂停引导')
    const saved = localStorage.getItem('studio-first-design:v1:7'); expect(saved).toContain('paused')
    mocks.user.userInfo.id = 8; await flushPromises(); expect(onboarding.progress.designId).toBe('')
    mocks.user.userInfo.id = 7; await flushPromises(); expect(onboarding.progress.step).toBe('time')
    await wrapper.get('.guide-launch').trigger('click'); await click('继续引导'); expect(onboarding.progress.status).toBe('active')
    expect(onboarding.progress.designId).toBe('first')
  })
  it('requires a new build when the selected watch changes', async () => {
    await setup(); await click('创建我的第一个表盘')
    onboarding.progress.step = 'download'; onboarding.progress.deviceId = 'venu3'
    onboarding.progress.submittedAt = 10; onboarding.progress.releaseId = 4
    mocks.user.editorDevice = { deviceId: 'fr965' }; await flushPromises()
    expect(onboarding.progress.step).toBe('build')
    expect(onboarding.progress.submittedAt).toBe(0)
    expect(onboarding.progress.releaseId).toBeUndefined()
  })
  it('highlights download only on the matching face route', async () => {
    vi.useFakeTimers()
    const router = await setup(); await click('创建我的第一个表盘')
    onboarding.latest = { designUid: 'first', product: { appId: 213313 } } as any
    onboarding.progress.step = 'download'
    const el = document.createElement('button'); el.dataset.onboarding = 'download'
    el.getClientRects = () => [{ width: 80 }] as any; document.body.append(el)
    await router.push('/faces/213313'); await flushPromises(); await vi.advanceTimersByTimeAsync(350)
    expect(el.classList.contains('onboarding-target')).toBe(true)
    expect(wrapper.text()).not.toContain('返回当前步骤')
    await router.push('/faces/999'); await flushPromises(); await vi.advanceTimersByTimeAsync(350)
    expect(el.classList.contains('onboarding-target')).toBe(false)
  })
  it('highlights name and device together and clears both on pause', async () => {
    vi.useFakeTimers()
    await setup(); await click('创建我的第一个表盘')
    const targets = ['name', 'device'].map(key => {
      const el = document.createElement('button'); el.dataset.onboarding = key
      el.getClientRects = () => [{ width: 80 }] as any; document.body.append(el); return el
    })
    await vi.advanceTimersByTimeAsync(350)
    expect(targets.every(el => el.classList.contains('onboarding-target'))).toBe(true)
    await click('暂停引导'); await vi.advanceTimersByTimeAsync(350)
    expect(targets.some(el => el.classList.contains('onboarding-target'))).toBe(false)
  })
  it('clears build highlights while waiting and explains when to download', async () => {
    vi.useFakeTimers()
    const router = await setup(); await click('创建我的第一个表盘')
    onboarding.progress.step = 'build'; await router.push('/designs/first'); await flushPromises()
    const el = document.createElement('button'); el.dataset.onboarding = 'build'
    el.getClientRects = () => [{ width: 80 }] as any; document.body.append(el)
    await vi.advanceTimersByTimeAsync(350); expect(el.classList.contains('onboarding-target')).toBe(true)
    submittedOnboardingBuild('first', 'venu3'); await flushPromises(); await vi.advanceTimersByTimeAsync(350)
    expect(el.classList.contains('onboarding-target')).toBe(false)
    expect(wrapper.get('[role="status"]').text()).toContain('构建完成后，再来下载')
    expect(wrapper.text()).not.toContain('正在等待当前步骤的操作区域加载')
    mocks.locale.currentLocale = 'en'; await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toContain('Come back to download when the build is complete')
  })
  it('reviews previous steps without losing build progress or skipping existing time', async () => {
    const router = await setup(); await click('创建我的第一个表盘')
    onboarding.latest = { designUid: 'first', product: { appId: 213313 } } as any
    Object.assign(onboarding.progress, { step: 'download', releaseId: 4, submittedAt: 10 })
    await router.push('/faces/213313'); await flushPromises()
    await click('上一步'); expect(wrapper.text()).toContain('5 / 7')
    expect(onboarding.progress.step).toBe('download'); expect(onboarding.progress.releaseId).toBe(4)
    await click('上一步'); expect(wrapper.text()).toContain('4 / 7')
    await click('上一步'); expect(router.currentRoute.value.fullPath).toBe('/design?id=first')
    mocks.elements.elements = [{ eleType: 'time' }]; await flushPromises()
    await click('上一步'); expect(wrapper.text()).toContain('2 / 7')
    await click('下一步'); expect(wrapper.text()).toContain('3 / 7')
    await click('下一步'); await click('下一步'); await click('下一步')
    expect(wrapper.text()).toContain('6 / 7'); expect(router.currentRoute.value.path).toBe('/faces/213313')
  })
  it('waits for a real device, supports English, and persists dismissal', async () => {
    await setup(); mocks.locale.currentLocale = 'en'; await flushPromises(); await click('Create my first watch face')
    mocks.user.editorDevice = null; await flushPromises()
    expect(wrapper.findAll('button').find(b => b.text() === 'Name and device are ready')!.attributes('disabled')).toBeDefined()
    await click('Pause guide'); expect(onboarding.progress.status).toBe('paused')
  })
})

it('opens an explicitly requested guide even when the account already has designs', async () => {
  const { enterWatchFaceGuide } = await import('./entry')
  enterWatchFaceGuide('7')
  mocks.cards.mockResolvedValue({ code: 0, data: { total: 12, list: [] } })
  await setup()
  expect(wrapper.find('[data-test="first-design-guide"]').exists()).toBe(true)
  expect(wrapper.text()).toContain('制作你的专属表盘')
  expect(wrapper.text()).toContain('1 / 7')
  expect(onboarding.progress.designId).toBe('first')
  expect(onboarding.launchRequested).toBe(false)
})
