// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBaseStore } from '@/stores/baseStore'
import { useVisualThemeStore } from '@/stores/visualThemeStore'
import type { VisualThemesConfig } from '@/types/visualTheme'
import VisualThemeSettings from './VisualThemeSettings.vue'

const messages = vi.hoisted(() => ({ warning: vi.fn() }))
vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.name ? `${key}:${params.name}` : key,
  }),
}))
vi.mock('element-plus', () => ({
  ElMessage: { warning: messages.warning },
  ElMessageBox: { prompt: vi.fn(), confirm: vi.fn() },
}))

const ElButton = {
  props: ['disabled', 'ariaLabel', 'title'],
  emits: ['click'],
  template: '<button class="el-button" :disabled="disabled" :aria-label="ariaLabel" :title="title" @click="$emit(\'click\')"><slot /></button>',
}

const stubs = {
  ElButton,
  ElSwitch: {
    props: ['modelValue', 'ariaLabel'],
    emits: ['change'],
    template: '<button class="theme-switch" :aria-label="ariaLabel" @click="$emit(\'change\', !modelValue)">switch</button>',
  },
  ElAlert: true,
  ElEmpty: true,
  ElColorPicker: true,
  VisualThemeAssetFields: true,
}

const config = (): VisualThemesConfig => ({
  version: 1,
  enabled: true,
  defaultThemeId: 'day',
  selectionMode: 'user',
  themes: [
    {
      id: 'day',
      name: 'Day',
      assets: {},
      colors: {},
      fallbackHands: { hourColor: '0xFFFFFF', minuteColor: '0xFFFFFF', secondColor: '0xFF0000' },
    },
    {
      id: 'night',
      name: 'Night',
      assets: {},
      colors: {},
      fallbackHands: { hourColor: '0xFFFFFF', minuteColor: '0xFFFFFF', secondColor: '0xFF0000' },
    },
  ],
})

const mountPanel = () => mount(VisualThemeSettings, { global: { stubs } })

describe('VisualThemeSettings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    messages.warning.mockClear()
  })

  it('tracks delayed hydrate and preview replacement as the active selection', async () => {
    const store = useVisualThemeStore()
    const wrapper = mountPanel()

    store.hydrate(config())
    await nextTick()
    expect(wrapper.find('[data-theme-id="day"]').classes()).toContain('active')

    store.setPreviewTheme('night')
    await nextTick()
    expect(wrapper.find('[data-theme-id="night"]').classes()).toContain('active')
    expect(wrapper.find('[data-theme-id="day"]').classes()).not.toContain('active')
  })

  it('selects themes and reorders through sibling controls with accessible labels', async () => {
    const store = useVisualThemeStore()
    store.hydrate(config())
    const wrapper = mountPanel()

    await wrapper.find('[data-theme-select="night"]').trigger('click')
    expect(store.previewThemeId).toBe('night')

    const nightRow = wrapper.find('[data-theme-id="night"]')
    expect(nightRow.element.tagName).toBe('DIV')
    expect(nightRow.find('button button').exists()).toBe(false)
    expect(wrapper.find('[data-theme-move-up="night"]').attributes('aria-label')).toBe('visualTheme.moveUpAria:Night')
    await wrapper.find('[data-theme-move-up="night"]').trigger('click')
    expect(store.themes.map((theme) => theme.id)).toEqual(['night', 'day'])
  })

  it('labels the enable switch and reports enable failure without creating config', async () => {
    const baseStore = useBaseStore()
    baseStore.generateConfig = vi.fn(() => null)
    const wrapper = mountPanel()

    expect(wrapper.find('.theme-switch').attributes('aria-label')).toBe('visualTheme.enableAria')
    await wrapper.find('.theme-switch').trigger('click')

    expect(messages.warning).toHaveBeenCalledWith('visualTheme.designRequired')
    expect(useVisualThemeStore().config).toBeUndefined()
  })

  it('disables adding when the five-theme limit is reached', async () => {
    const store = useVisualThemeStore()
    const fullConfig = config()
    fullConfig.themes.push(
      ...['sport', 'classic', 'minimal'].map((id) => ({
        ...structuredClone(fullConfig.themes[0]),
        id,
        name: id,
      })),
    )
    store.hydrate(fullConfig)

    const wrapper = mountPanel()
    expect(wrapper.find('[data-theme-add]').attributes('disabled')).toBeDefined()
  })
})
