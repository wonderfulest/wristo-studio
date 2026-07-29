// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBaseStore } from '@/stores/baseStore'
import { useVisualThemeStore } from '@/stores/visualThemeStore'
import type { VisualThemesConfig } from '@/types/visualTheme'
import VisualThemeSettings from './VisualThemeSettings.vue'

const messages = vi.hoisted(() => ({ warning: vi.fn() }))
const themeApi = vi.hoisted(() => ({ getThemeRuleDetail: vi.fn() }))
vi.mock('@/api/wristo/themes', () => themeApi)
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
    themeApi.getThemeRuleDetail.mockReset()
    themeApi.getThemeRuleDetail.mockResolvedValue({ data: { data: null } })
  })

  it('blocks visual theme enable after a delayed active-rule load without mutating the store', async () => {
    let resolveRule!: (value: unknown) => void
    themeApi.getThemeRuleDetail.mockReturnValue(new Promise((resolve) => {
      resolveRule = resolve
    }))
    const baseStore = useBaseStore()
    baseStore.appId = 42
    baseStore.generateConfig = vi.fn()
    const wrapper = mountPanel()

    const click = wrapper.find('.theme-switch').trigger('click')
    resolveRule({ data: { data: { active: 1 } } })
    await click
    await flushPromises()

    expect(messages.warning).toHaveBeenCalledWith('visualTheme.dynamicRuleConflict')
    expect(baseStore.generateConfig).not.toHaveBeenCalled()
    expect(useVisualThemeStore().config).toBeUndefined()
  })

  it.each([
    ['integer zero', { data: { data: { active: 0 } } }],
    ['boolean false', { data: { data: { active: false } } }],
    ['null rule', { data: { data: null } }],
  ])('allows visual enable past an inactive %s response', async (_label, response) => {
    themeApi.getThemeRuleDetail.mockResolvedValue(response)
    const baseStore = useBaseStore()
    baseStore.appId = 42
    baseStore.generateConfig = vi.fn(() => null)
    const wrapper = mountPanel()

    await wrapper.find('.theme-switch').trigger('click')
    await flushPromises()

    expect(messages.warning).toHaveBeenCalledWith('visualTheme.designRequired')
    expect(messages.warning).not.toHaveBeenCalledWith('visualTheme.dynamicRuleConflict')
  })

  it.each([
    ['integer one', { data: { data: { active: 1 } } }],
    ['boolean true', { data: { data: { active: true } } }],
    ['legacy missing active', { data: { data: { ruleType: 'SUN' } } }],
    ['direct API body', { data: { active: 1 } }],
  ])('blocks visual enable for an active %s response shape', async (_label, response) => {
    themeApi.getThemeRuleDetail.mockResolvedValue(response)
    const baseStore = useBaseStore()
    baseStore.appId = 42
    baseStore.generateConfig = vi.fn(() => null)
    const wrapper = mountPanel()

    await wrapper.find('.theme-switch').trigger('click')
    await flushPromises()

    expect(messages.warning).toHaveBeenCalledWith('visualTheme.dynamicRuleConflict')
    expect(baseStore.generateConfig).not.toHaveBeenCalled()
  })

  it('still allows disabling visual themes while a dynamic rule is reported active', async () => {
    const store = useVisualThemeStore()
    store.hydrate(config())
    const wrapper = mount(VisualThemeSettings, {
      props: { dynamicRuleConflict: true },
      global: { stubs },
    })

    await wrapper.find('.theme-switch').trigger('click')

    expect(store.config?.enabled).toBe(false)
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
    await flushPromises()

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
