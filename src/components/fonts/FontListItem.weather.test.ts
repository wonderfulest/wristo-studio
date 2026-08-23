// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import FontListItem from './FontListItem.vue'
import FontFamilyList from '@/components/font-picker/FontFamilyList.vue'
import { useFontStore } from '@/stores/fontStore'
import { useUserStore } from '@/stores/user'

vi.mock('opentype.js', () => ({ default: {}, parse: vi.fn() }))
vi.mock('@/api/wristo/fonts', () => ({
  favoriteFont: vi.fn(),
  unfavoriteFont: vi.fn(),
  removeAdminFont: vi.fn(),
  removeMyFont: vi.fn(),
}))

describe('weather font list item', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setActivePinia(createPinia())
    useUserStore().setUserInfo({ id: 7, roles: [{ roleCode: 'ROLE_MERCHANT' }] } as any)
    useFontStore().loadFont = vi.fn().mockResolvedValue(true)
  })

  it('hides the slug from the card and exposes it from the font name on hover', async () => {
    const wrapper = mount(FontListItem, {
      props: {
        fontFamily: 'quantico-dc529d7bcb40',
        fontSlug: 'quantico-dc529d7bcb40',
        label: 'Quantico',
      },
      global: { stubs: { FontPreviewText: true, 'el-icon': true, 'el-tag': true } },
    })

    await vi.waitFor(() => expect(wrapper.find('.font-name').attributes('title')).toBe('quantico-dc529d7bcb40'))
    expect(wrapper.find('.font-slug').exists()).toBe(false)
    expect(wrapper.get('.font-name').attributes('title')).toBe('quantico-dc529d7bcb40')
  })

  it('shows icon editing for an admin on a system font', async () => {
    useUserStore().setUserInfo({ id: 7, roles: [{ roleCode: 'ROLE_ADMIN' }] } as any)
    const wrapper = mount(FontListItem, {
      props: {
        fontFamily: 'wristo-icon',
        fontSlug: 'wristo-icon',
        label: 'Wristo Icon',
        type: 'icon_font',
        fontId: 77,
        ownerUserId: 99,
        isSystem: true,
      },
      global: { stubs: { FontPreviewText: true, 'el-tooltip': true, 'el-icon': true, 'el-tag': true } },
    })

    await vi.waitFor(() => expect(wrapper.find('.font-icon-btn-edit').exists()).toBe(true))
  })

  it('opens the dedicated weather font library editor', async () => {
    const openWindow = vi.spyOn(window, 'open').mockReturnValue(null)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/icon-library', name: 'IconLibrary', component: { template: '<div />' } },
        { path: '/weather-font-library', name: 'WeatherFontLibrary', component: { template: '<div />' } },
        { path: '/fonts/bitmap-maker', name: 'BitmapFontMaker', component: { template: '<div />' } },
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(FontListItem, {
      props: {
        fontFamily: 'weather-custom',
        label: 'Weather Custom',
        type: 'weather_font',
        fontId: 88,
        ownerUserId: 7,
        isSystem: false,
      },
      global: {
        plugins: [router],
        stubs: {
          FontPreviewText: true,
          'el-tooltip': { template: '<div><slot /></div>' },
          'el-icon': { template: '<span><slot /></span>' },
          'el-tag': true,
        },
      },
    })

    await vi.waitFor(() => expect(wrapper.find('.font-icon-btn-edit').exists()).toBe(true))
    await wrapper.get('.font-icon-btn-edit').trigger('click')
    expect(openWindow).toHaveBeenCalledWith('/weather-font-library?fontId=88&glyphCode=weather-custom&editBitmap=1', '_blank', 'noopener')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('opens the bitmap maker in the current text type and hides editing for another owner', async () => {
    const openWindow = vi.spyOn(window, 'open').mockReturnValue(null)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/fonts/bitmap-maker', name: 'BitmapFontMaker', component: { template: '<div />' } },
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(FontListItem, {
      props: {
        fontFamily: 'my-chinese',
        type: 'text_font_zh',
        fontId: 91,
        ownerUserId: 7,
        isSystem: false,
      },
      global: { plugins: [router], stubs: { FontPreviewText: true, 'el-icon': true, 'el-tag': true } },
    })
    await vi.waitFor(() => expect(wrapper.find('.font-icon-btn-edit').exists()).toBe(true))
    await wrapper.get('.font-icon-btn-edit').trigger('click')
    expect(openWindow).toHaveBeenCalledWith('/fonts/bitmap-maker?fontId=91&fontType=text_font_zh', '_blank', 'noopener')
    expect(router.currentRoute.value.path).toBe('/')

    await wrapper.setProps({ ownerUserId: 8 })
    expect(wrapper.find('.font-icon-btn-edit').exists()).toBe(false)
  })

  it('shows quick edit on an owned single-font card in the picker', async () => {
    const openWindow = vi.spyOn(window, 'open').mockReturnValue(null)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/fonts/bitmap-maker', name: 'BitmapFontMaker', component: { template: '<div />' } },
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(FontFamilyList, {
      props: {
        fonts: [{ id: 42, userId: 7, value: 'quantico', family: 'Quantico', label: 'Quantico', type: 'time_font' }],
        modelValue: 'quantico',
      },
      global: {
        plugins: [router],
        stubs: {
          FontPreviewText: true,
          'el-tooltip': { template: '<div><slot /></div>' },
          'el-icon': { template: '<span><slot /></span>' },
          'el-tag': true,
        },
      },
    })

    await vi.waitFor(() => expect(wrapper.find('.font-icon-btn-edit').exists()).toBe(true))
    await wrapper.get('.font-icon-btn-edit').trigger('click')
    expect(openWindow).toHaveBeenCalledWith('/fonts/bitmap-maker?fontId=42&fontType=time_font', '_blank', 'noopener')
    expect(router.currentRoute.value.path).toBe('/')
  })
})
