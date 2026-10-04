// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ balance: vi.fn(), history: vi.fn(), user: null as any }))
vi.mock('@/api/wristo/studioCredits', () => ({ studioCreditsApi: mocks }))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.user }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string, params?: { count: number }) => params ? `${key} ${params.count}` : key }) }))
import StudioCredits from './StudioCredits.vue'
const wrappers: any[] = []
function setup() {
  const wrapper = mount(StudioCredits, { global: { directives: { loading: () => {} }, stubs: {
    ElDialog: { props: ['modelValue'], template: '<section v-if="modelValue"><slot /></section>' },
    ElSelect: { name: 'ElSelect', props: ['modelValue'], emits: ['update:modelValue','change'], template: '<div><slot /></div>' },
    ElOption: true,
    ElTable: { props: ['data'], template: '<div>{{ JSON.stringify(data) }}</div>' },
    ElTableColumn: true,
    ElPagination: { name: 'ElPagination', props: ['currentPage','total'], emits: ['update:currentPage','current-change'], template: '<div />' },
    ElButton: { template: '<button><slot /></button>' },
  } } })
  wrappers.push(wrapper); return wrapper
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.user = reactive({ isAuthenticated: true, userInfo: { id: 7 } })
  mocks.balance.mockResolvedValue({ code: 0, data: { balance: 100 } })
  mocks.history.mockResolvedValue({ code: 0, data: { items: [{ id: '1', type: 'REGISTRATION_GIFT', delta: 100 }], total: 42 } })
})
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()) })
describe('Studio credits wallet', () => {
  it('shows the balance and opens paged history', async () => {
    const w=setup(); await flushPromises()
    expect(w.find('button').text()).toContain('100')
    await w.find('button').trigger('click'); await flushPromises()
    expect(mocks.history).toHaveBeenLastCalledWith(1,'')
    expect(w.text()).toContain('REGISTRATION_GIFT')
    const pagination=w.findComponent({ name: 'ElPagination' })
    pagination.vm.$emit('update:currentPage',2); pagination.vm.$emit('current-change',2)
    await flushPromises(); expect(mocks.history).toHaveBeenLastCalledWith(2,'')
    const filter=w.findComponent({ name:'ElSelect' })
    filter.vm.$emit('update:modelValue','AI_BANNER'); filter.vm.$emit('change','AI_BANNER')
    await flushPromises(); expect(mocks.history).toHaveBeenLastCalledWith(1,'AI_BANNER')
  })
  it('refreshes after AI calls including failures', async () => {
    const w=setup(); await flushPromises()
    mocks.balance.mockResolvedValue({ data:{ balance:99 } })
    window.dispatchEvent(new Event('studio-credits-changed')); await flushPromises()
    expect(w.find('button').text()).toContain('99')
  })
  it('ignores old-account responses after the account changes', async () => {
    let resolve!: (value:any) => void
    mocks.balance.mockImplementationOnce(() => new Promise(r => { resolve=r }))
    const w=setup(); await nextTick()
    mocks.balance.mockResolvedValue({ data:{ balance:23 } })
    mocks.user.userInfo.id=8; await flushPromises()
    resolve({ data:{ balance:100 } }); await flushPromises()
    expect(w.find('button').text()).toContain('23')
  })
  it('shows a retry state when history fails', async () => {
    mocks.history.mockRejectedValueOnce(new Error('offline'))
    const w=setup(); await flushPromises(); await w.find('button').trigger('click'); await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('credits.loadFailed')
    await w.find('[role="alert"] button').trigger('click'); await flushPromises()
    expect(w.find('[role="alert"]').exists()).toBe(false)
  })
})
