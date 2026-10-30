// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ cards: vi.fn(), push: vi.fn(), refresh: vi.fn() }))
vi.mock('@/api/wristo/design', () => ({ designApi: { getDesignCards: mocks.cards } }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ isStudioConsumer: true, userInfo: { id: 1 }, refreshUserInfo: mocks.refresh }) }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
import DesignLimitDialog from './DesignLimitDialog.vue'
let wrapper: ReturnType<typeof mount>
beforeEach(() => {
  vi.clearAllMocks()
  mocks.refresh.mockResolvedValue(undefined)
  wrapper = mount(DesignLimitDialog, { global: { stubs: {
    ElDialog: { props: ['modelValue'], template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>' },
    ElButton: { template: '<button><slot /></button>' },
  } } })
  window.dispatchEvent(new Event('studio-design-limit-reached'))
})
afterEach(() => wrapper.unmount())
it('offers permanent extra slots to consumers without a per-design unlock', async () => {
  await flushPromises()
  expect(wrapper.get('a').attributes('href')).toBe('/design-slots')
  expect(wrapper.text()).toContain('membership.limitOptions')
  expect(wrapper.text()).not.toContain('membership.unlockMore')
})
it('takes the editing action to existing designs', async () => {
  await flushPromises()
  await wrapper.findAll('button')[0].trigger('click')
  expect(mocks.push).toHaveBeenCalledWith('/designs')
})
