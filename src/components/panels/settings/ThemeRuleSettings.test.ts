// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBaseStore } from '@/stores/baseStore'
import { useVisualThemeStore } from '@/stores/visualThemeStore'
import type { VisualThemesConfig } from '@/types/visualTheme'
import ThemeRuleSettings from './ThemeRuleSettings.vue'

const messages = vi.hoisted(() => ({
  error: vi.fn(),
  warning: vi.fn(),
  success: vi.fn(),
}))
const themeApi = vi.hoisted(() => ({
  getThemeRuleDetail: vi.fn(),
  upsertThemeRule: vi.fn(),
  activateThemeRule: vi.fn(),
}))
const commonApi = vi.hoisted(() => ({ getEnumOptions: vi.fn() }))

vi.mock('element-plus', () => ({ ElMessage: messages }))
vi.mock('@/api/wristo/themes', () => themeApi)
vi.mock('@/api/common', () => commonApi)
vi.mock('@/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const visualConfig = (): VisualThemesConfig => ({
  version: 1,
  enabled: true,
  defaultThemeId: 'default',
  selectionMode: 'user',
  themes: [{
    id: 'default',
    name: 'Default',
    assets: {},
    colors: {},
    fallbackHands: { hourColor: '0xFFFFFF', minuteColor: '0xFFFFFF', secondColor: '0xFF0000' },
  }],
})

const stubs = {
  ElSelect: {
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
    template: '<button class="rule-select"><slot /></button>',
  },
  ElOption: true,
  ElSwitch: {
    props: ['modelValue'],
    emits: ['update:modelValue', 'change'],
    template: `<button class="rule-switch" @click="$emit('update:modelValue', !modelValue); $emit('change', !modelValue)">switch</button>`,
  },
  ElInput: true,
  ElButton: {
    inheritAttrs: false,
    emits: ['click'],
    template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
  },
  ThemeConfigSettings: true,
}

const mountPanel = () => mount(ThemeRuleSettings, { global: { stubs } })

describe('ThemeRuleSettings conflict guard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useBaseStore().appId = 42
    commonApi.getEnumOptions.mockReset()
    commonApi.getEnumOptions.mockResolvedValue({ data: [] })
    themeApi.getThemeRuleDetail.mockReset()
    themeApi.getThemeRuleDetail.mockResolvedValue({ data: { data: null } })
    themeApi.activateThemeRule.mockReset()
    themeApi.activateThemeRule.mockResolvedValue({})
    themeApi.upsertThemeRule.mockReset()
    messages.error.mockClear()
    messages.warning.mockClear()
  })

  it('blocks activation after delayed visual-theme hydrate without calling the API', async () => {
    const wrapper = mountPanel()
    await flushPromises()
    useVisualThemeStore().hydrate(visualConfig())

    await wrapper.find('.rule-switch').trigger('click')
    await flushPromises()

    expect(themeApi.activateThemeRule).not.toHaveBeenCalled()
    expect(messages.warning).toHaveBeenCalledWith('elementSettings.visualThemeConflict')
  })

  it('allows deactivation even when visual themes are enabled', async () => {
    themeApi.getThemeRuleDetail.mockResolvedValue({
      data: { data: { ruleType: 'SUN', ruleCalculation: {}, active: 1 } },
    })
    useVisualThemeStore().hydrate(visualConfig())
    const wrapper = mountPanel()
    await flushPromises()

    await wrapper.find('.rule-switch').trigger('click')
    await flushPromises()

    expect(themeApi.activateThemeRule).toHaveBeenCalledWith({ appId: 42, isActive: false })
  })

  it('treats an inactive rule object as disabled when toggling', async () => {
    themeApi.getThemeRuleDetail.mockResolvedValue({
      data: { data: { ruleType: 'SUN', ruleCalculation: {}, active: 0 } },
    })
    const wrapper = mountPanel()
    await flushPromises()

    await wrapper.find('.rule-switch').trigger('click')
    await flushPromises()

    expect(themeApi.activateThemeRule).toHaveBeenCalledWith({ appId: 42, isActive: true })
  })

  it('blocks saving an active rule while visual themes are enabled', async () => {
    themeApi.getThemeRuleDetail.mockResolvedValue({
      data: { data: { ruleType: 'SUN', ruleCalculation: {}, active: 1 } },
    })
    useVisualThemeStore().hydrate(visualConfig())
    const wrapper = mountPanel()
    await flushPromises()

    await wrapper.find('[data-save-theme-rule]').trigger('click')
    await flushPromises()

    expect(themeApi.upsertThemeRule).not.toHaveBeenCalled()
    expect(messages.warning).toHaveBeenCalledWith('elementSettings.visualThemeConflict')
  })
})
