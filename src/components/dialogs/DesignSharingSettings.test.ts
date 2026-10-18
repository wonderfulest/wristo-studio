// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ getDesignSharing: vi.fn(), updateDesignSharing: vi.fn() }))
vi.mock('@/api/wristo/designSharing', () => api)
vi.mock('@/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
import DesignSharingSettings from './DesignSharingSettings.vue'
const show = async () => {
  const wrapper = mount(DesignSharingSettings, { props: { designUid: 'd1' } })
  await flushPromises()
  return wrapper
}
describe('independent design visibility and copying switches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getDesignSharing.mockResolvedValue({ publiclyVisible: true, allowRemix: false })
  })
  it('loads persisted values and saves only visibility', async () => {
    const wrapper = await show()
    const switches = wrapper.findAll('[role="switch"]')
    expect(switches[0].attributes('aria-checked')).toBe('true')
    expect(switches[1].attributes('aria-checked')).toBe('false')
    api.updateDesignSharing.mockResolvedValue({ publiclyVisible: false, allowRemix: false })
    await switches[0].trigger('click'); await flushPromises()
    expect(api.updateDesignSharing).toHaveBeenCalledWith('d1', { publiclyVisible: false })
    expect(switches[0].attributes('aria-checked')).toBe('false')
    expect(switches[1].attributes('aria-checked')).toBe('false')
    expect(wrapper.emitted('saved')).toHaveLength(1)
    wrapper.unmount()
  })
  it('can change the copying preference while private without publishing', async () => {
    api.getDesignSharing.mockResolvedValue({ publiclyVisible: false, allowRemix: false })
    api.updateDesignSharing.mockResolvedValue({ publiclyVisible: false, allowRemix: true })
    const wrapper = await show()
    await wrapper.findAll('[role="switch"]')[1].trigger('click'); await flushPromises()
    expect(api.updateDesignSharing).toHaveBeenCalledWith('d1', { allowRemix: true })
    expect(wrapper.findAll('[role="switch"]')[0].attributes('aria-checked')).toBe('false')
    expect(wrapper.findAll('[role="switch"]')[1].attributes('aria-checked')).toBe('true')
    wrapper.unmount()
  })
  it('keeps persisted values and reports a failed save', async () => {
    api.updateDesignSharing.mockRejectedValue(new Error('failed'))
    const wrapper = await show()
    await wrapper.findAll('[role="switch"]')[0].trigger('click'); await flushPromises()
    expect(wrapper.findAll('[role="switch"]')[0].attributes('aria-checked')).toBe('true')
    expect(wrapper.get('[role="alert"]').text()).toBe('designSharing.saveFailed')
    expect(wrapper.emitted('saved')).toBeUndefined()
    wrapper.unmount()
  })
  it('disables both switches during save and prevents duplicate writes', async () => {
    let resolve!: (value: unknown) => void
    api.updateDesignSharing.mockReturnValue(new Promise(r => { resolve = r }))
    const wrapper = await show()
    await wrapper.findAll('[role="switch"]')[0].trigger('click')
    expect(wrapper.findAll('[role="switch"]').every(button => button.attributes('disabled') != null)).toBe(true)
    await wrapper.findAll('[role="switch"]')[1].trigger('click')
    expect(api.updateDesignSharing).toHaveBeenCalledOnce()
    resolve({ publiclyVisible: false, allowRemix: false }); await flushPromises()
    wrapper.unmount()
  })
  it('ignores an old design response after navigating to another design', async () => {
    let resolve!: (value: unknown) => void
    api.updateDesignSharing.mockReturnValue(new Promise(r => { resolve = r }))
    const wrapper = await show()
    await wrapper.findAll('[role="switch"]')[0].trigger('click')
    await wrapper.setProps({ designUid: 'd2' }); await flushPromises()
    resolve({ publiclyVisible: false, allowRemix: true }); await flushPromises()
    expect(wrapper.findAll('[role="switch"]')[0].attributes('aria-checked')).toBe('true')
    expect(wrapper.emitted('saved')).toBeUndefined()
    wrapper.unmount()
  })
  it('does not expose editable defaults when loading fails and supports retry', async () => {
    api.getDesignSharing.mockRejectedValueOnce(new Error('denied'))
    const wrapper = await show()
    expect(wrapper.get('[role="alert"]').text()).toBe('designSharing.loadFailed')
    expect(wrapper.findAll('[role="switch"]').every(button => button.attributes('disabled') != null)).toBe(true)
    await wrapper.findAll('button').find(button => button.text() === 'designSharing.retry')!.trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
