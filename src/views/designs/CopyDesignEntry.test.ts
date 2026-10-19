// @vitest-environment jsdom
import { mount, flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ create: vi.fn(), replace: vi.fn(), refresh: vi.fn(), error: vi.fn() }))
vi.mock('@/api/wristo/design', () => ({ designApi: { createDesignByCopy: mocks.create } }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: { from: 'source-design' } }), useRouter: () => ({ replace: mocks.replace }) }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ refreshUserInfo: mocks.refresh }) }))
vi.mock('@/stores/message', () => ({ useMessageStore: () => ({ error: mocks.error, success: vi.fn() }) }))
vi.mock('@/utils/errorMessage', () => ({ showErrorOnce: mocks.error }))
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
import CopyDesignEntry from './CopyDesignEntry.vue'
let wrapper: ReturnType<typeof mount> | undefined
beforeEach(() => { vi.clearAllMocks() })
afterEach(() => wrapper?.unmount())
const render = async () => { wrapper = mount(CopyDesignEntry, { global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } }); await flushPromises() }
it('stops the spinner on quota denial and can retry the shared source after adding a slot', async () => {
  mocks.create.mockRejectedValueOnce({ code: 2004, msg: 'Design allowance reached' })
  await render()
  expect(wrapper!.find('.copy-entry-spinner').exists()).toBe(false)
  expect(wrapper!.find('a[href="/design-slots"]').exists()).toBe(true)
  mocks.create.mockResolvedValueOnce({ code: 0, data: { designUid: 'new-design' } })
  await wrapper!.get('button').trigger('click'); await flushPromises()
  expect(mocks.create).toHaveBeenLastCalledWith({ uid: 'source-design' })
  expect(mocks.replace).toHaveBeenCalledWith('/design?id=new-design')
})
it('does not suggest buying capacity for a source access error', async () => {
  mocks.create.mockRejectedValueOnce({ code: 403, msg: 'Source is private' })
  await render(); expect(wrapper!.find('a[href="/design-slots"]').exists()).toBe(false)
  expect(wrapper!.text()).toContain('Source is private')
})
