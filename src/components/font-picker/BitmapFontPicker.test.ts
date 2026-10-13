// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BitmapFontPicker from './BitmapFontPicker.vue'
import { getBitmapFontDetail } from '@/api/wristo/bitmapFont'
import { useBitmapFontStore } from '@/stores/bitmapFontStore'

vi.mock('@/stores/fontStore', () => ({ useFontStore: () => ({
  fetchFonts: vi.fn(), initBuiltinFontsFromSystem: vi.fn(), initRecentFonts: vi.fn(),
}) }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ canUsePremiumStudioAssets: true, isAdminUser: true }) }))
vi.mock('@/composables/useStudioMembershipGate', () => ({ useStudioMembershipGate: () => ({ requirePremium: vi.fn() }) }))
vi.mock('@/elements/time/time/time.renderer', () => ({ invalidateBitmapTimeFontCache: vi.fn() }))
vi.mock('@/components/font-picker/BitmapDigitDialog.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/api/wristo/bitmapFont', () => ({ getBitmapFontDetail: vi.fn() }))

const scroll = vi.fn()
const mountPicker = async () => {
  const wrapper = mount(BitmapFontPicker, {
    props: { modelValue: 42 },
    global: { stubs: {
      'el-icon': true, 'el-segmented': true,
      BitmapFontList: {
        props: ['fonts', 'activeId'],
        template: '<div><div v-for="font in fonts" class="bitmap-font-item" :class="{ active: font.id === activeId }">{{ font.fontName }}</div></div>',
      },
    } },
  })
  await wrapper.get('.font-preview').trigger('click')
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  useBitmapFontStore().fonts = [{ id: 1, fontName: 'First page font' }]
  HTMLElement.prototype.scrollIntoView = scroll
})

describe('bitmap font location', () => {
  it('fetches the selected font directly without changing pagination or selection', async () => {
    vi.mocked(getBitmapFontDetail).mockResolvedValue({ data: { id: 42, fontName: 'Current font' } } as any)
    const wrapper = await mountPicker()
    await wrapper.get('.locate-font-btn').trigger('click')
    await flushPromises()
    expect(getBitmapFontDetail).toHaveBeenCalledWith(42)
    expect(wrapper.get('.bitmap-font-item.active').text()).toBe('Current font')
    expect(scroll).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' })
    expect(useBitmapFontStore().fonts).toHaveLength(1)
    expect(wrapper.emitted('change')).toBeUndefined()
    expect(wrapper.get('.font-name').text()).toBe('Current font')
    wrapper.unmount()
  })

  it('locates an already loaded font without a detail request', async () => {
    useBitmapFontStore().fonts.push({ id: 42, fontName: 'Loaded font' })
    const wrapper = await mountPicker()
    await wrapper.get('.locate-font-btn').trigger('click')
    await flushPromises()
    expect(getBitmapFontDetail).not.toHaveBeenCalled()
    expect(scroll).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('ignores a stale lookup after switching elements', async () => {
    let resolve!: (value: any) => void
    vi.mocked(getBitmapFontDetail).mockReturnValue(new Promise(done => { resolve = done }))
    const wrapper = await mountPicker()
    await wrapper.get('.locate-font-btn').trigger('click')
    await wrapper.setProps({ modelValue: 99 })
    resolve({ data: { id: 42, fontName: 'Old font' } })
    await flushPromises()
    expect(wrapper.text()).not.toContain('Old font')
    expect(scroll).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
