// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ progress: vi.fn(), checkIn: vi.fn(), download: vi.fn(), user: null as any }))
vi.mock('@/api/wristo/userRewards', () => ({ userRewardsApi: mocks }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
import UserCreditTasks from './UserCreditTasks.vue'
const data = () => ({ settings: { checkInEnabled: true, checkInCredits: 1, purchaseEnabled: true, purchaseCredits: 3, downloadEnabled: true, downloadCredits: 1, downloadDailyLimit: 5 }, day: '2026-10-05', checkedIn: false, downloadCreditsToday: 0, purchasesRewarded: 0, downloadsRewarded: 0 })
const wrappers: ReturnType<typeof mount>[] = []
function setup(active = true) {
  const w = mount(UserCreditTasks, { props: { active }, global: { directives: { loading: () => {} }, stubs: { ElButton: { props: ['disabled', 'nativeType'], template: '<button :type="nativeType || \'button\'" :disabled="disabled"><slot /></button>' } } } })
  wrappers.push(w); return w
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('VITE_WRISTO_STORE_URL', 'https://wristo.example')
  mocks.user = reactive({ isAuthenticated: true, userInfo: { id: 7 } })
  mocks.progress.mockResolvedValue({ code: 0, data: data() })
  mocks.checkIn.mockResolvedValue({ code: 0, data: { ...data(), checkedIn: true } })
  mocks.download.mockResolvedValue({ code: 0, data: { ...data(), downloadCreditsToday: 1, downloadsRewarded: 1 } })
})
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.unstubAllEnvs() })
describe('user credit tasks', () => {
  it('loads only when open and disables check-in after receiving the reward', async () => {
    const w = setup(false); await flushPromises(); expect(mocks.progress).not.toHaveBeenCalled()
    await w.setProps({ active: true }); await flushPromises()
    await w.find('[data-testid="check-in"]').trigger('click'); await flushPromises()
    expect(mocks.checkIn).toHaveBeenCalledTimes(1)
    expect(w.find('[data-testid="check-in"]').attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('credits.checkedIn')
  })
  it('links download tasks to the store', async () => {
    const w = setup(); await flushPromises()
    expect(w.find('a').attributes('href')).toContain('wristo')
    expect(w.find('a').text()).toContain('credits.browseDownloads')
  })
  it('blocks repeated clicks while a claim is pending and shows a retryable error', async () => {
    let reject!: (e: unknown) => void
    mocks.checkIn.mockImplementation(() => new Promise((_, r) => { reject = r }))
    const w = setup(); await flushPromises()
    await w.find('[data-testid="check-in"]').trigger('click')
    await w.find('[data-testid="check-in"]').trigger('click')
    expect(mocks.checkIn).toHaveBeenCalledTimes(1)
    reject({ msg: 'Rewards are paused' }); await flushPromises()
    expect(w.text()).toContain('Rewards are paused')
    expect(w.find('[data-testid="check-in"]').attributes('disabled')).toBeUndefined()
  })
  it('does not show stale account results after switching accounts', async () => {
    let resolve!: (value: unknown) => void
    mocks.checkIn.mockImplementation(() => new Promise(r => { resolve = r }))
    const w = setup(); await flushPromises()
    await w.find('[data-testid="check-in"]').trigger('click')
    mocks.user.userInfo.id = 8; await flushPromises()
    resolve({ code: 0, data: { ...data(), checkedIn: true } }); await flushPromises()
    expect(w.find('[data-testid="check-in"]').attributes('disabled')).toBeUndefined()
  })
  it('hides the download link when rewards are paused', async () => {
    mocks.progress.mockResolvedValueOnce({ code: 0, data: { ...data(), settings: { ...data().settings, downloadEnabled: false } } })
    const w = setup(); await flushPromises()
    expect(w.find('a').exists()).toBe(false)
    expect(w.text()).toContain('credits.taskPaused')
  })
  it('keeps failed loading visible and lets the user refresh', async () => {
    mocks.progress.mockRejectedValueOnce(new Error('offline'))
    const w = setup(); await flushPromises()
    expect(w.text()).toContain('credits.tasksLoadFailed')
    await w.find('header button').trigger('click'); await flushPromises()
    expect(w.find('[data-testid="check-in"]').exists()).toBe(true)
  })
})
