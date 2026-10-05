// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { expect, it, vi } from 'vitest'
vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn() } }))
import InsufficientCreditsDialog from './InsufficientCreditsDialog.vue'
import { showErrorOnce } from '@/utils/errorMessage'
it('shows the required credits and opens purchases in a separate tab', async () => {
  const wrapper = mount(InsufficientCreditsDialog, { global: { stubs: {
    ElDialog: { props: ['modelValue'], template: '<section v-if="modelValue"><slot/><slot name="footer"/></section>' },
    ElButton: { template: '<button><slot/></button>' },
  } } })
  const error = { code: 409, msg: 'Insufficient AI credits: balance=3, required=20' }
  showErrorOnce(error, error.msg); await nextTick()
  expect(wrapper.text()).toContain('20 credits'); expect(wrapper.text()).toContain('balance is 3')
  expect(wrapper.get('a').attributes()).toMatchObject({ href: '/credits', target: '_blank', rel: 'noopener' })
  wrapper.unmount()
})
