// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBaseStore } from '@/stores/baseStore'
import { usePropertiesStore } from '@/stores/properties'
import { useVisualThemeStore } from '@/stores/visualThemeStore'
import type { VisualThemesConfig } from '@/types/visualTheme'
import VisualThemeSettings from './VisualThemeSettings.vue'

const panelSource = readFileSync('src/components/panels/settings/VisualThemeSettings.vue', 'utf8')

const messages = vi.hoisted(() => ({ warning: vi.fn(), error: vi.fn() }))
const themeApi = vi.hoisted(() => ({ getThemeRuleDetail: vi.fn() }))
vi.mock('@/api/wristo/themes', () => themeApi)
vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.name ? `${key}:${params.name}` : key,
  }),
}))
vi.mock('element-plus', () => ({
  ElMessage: { warning: messages.warning, error: messages.error },
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
    props: ['modelValue', 'ariaLabel', 'disabled'],
    emits: ['change'],
    template: '<button class="theme-switch" :disabled="disabled" :aria-label="ariaLabel" @click="$emit(\'change\', !modelValue)">switch</button>',
  },
  ElAlert: true,
  ElEmpty: true,
  ElColorPicker: true,
  ElSegmented: {
    props: ['modelValue', 'options'],
    emits: ['change'],
    template: '<button class="owner-segmented" @click="$emit(\'change\', modelValue === \'theme\' ? \'user\' : \'theme\')">owner</button>',
  },
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
    messages.error.mockClear()
    themeApi.getThemeRuleDetail.mockReset()
    themeApi.getThemeRuleDetail.mockResolvedValue({ data: { data: null } })
  })

  it('keeps fallback hand colors available in the full editor', () => {
    expect(panelSource).toContain("t('visualTheme.fallbackHandColors')")
    expect(panelSource).toContain('store.updateFallbackColor')
  })

  it('enables themes with authoritative element snapshots for the background slot', () => {
    expect(panelSource).toContain('store.enableFromDesign(')
    expect(panelSource).toMatch(
      /elementDataStore\.elements\.map\(\(snapshot\)\s*=>\s*snapshot\.config/,
    )
  })

  it('does not require hour or minute hand layers', () => {
    expect(panelSource).not.toContain('missingRequiredLayers')
    expect(panelSource).not.toContain('visualTheme.missingRequiredLayers')
  })

  it('fails closed when the dynamic-rule check rejects', async () => {
    themeApi.getThemeRuleDetail.mockRejectedValue(new Error('timeout'))
    const baseStore = useBaseStore()
    baseStore.appId = 42
    baseStore.generateConfig = vi.fn()
    const wrapper = mountPanel()

    await wrapper.find('.theme-switch').trigger('click')
    await flushPromises()

    expect(messages.error).toHaveBeenCalledWith('visualTheme.ruleCheckFailed')
    expect(baseStore.generateConfig).not.toHaveBeenCalled()
    expect(useVisualThemeStore().config).toBeUndefined()
  })

  it('discards a stale app lookup and lets the current app result govern enable', async () => {
    let resolveA!: (value: unknown) => void
    let resolveB!: (value: unknown) => void
    themeApi.getThemeRuleDetail
      .mockReturnValueOnce(new Promise((resolve) => { resolveA = resolve }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveB = resolve }))
    const baseStore = useBaseStore()
    baseStore.appId = 101
    baseStore.generateConfig = vi.fn(() => null)
    const wrapper = mountPanel()

    const click = wrapper.find('.theme-switch').trigger('click')
    baseStore.appId = 202
    await nextTick()
    resolveA({ data: { data: { active: 1 } } })
    await flushPromises()
    expect(themeApi.getThemeRuleDetail).toHaveBeenNthCalledWith(2, 202)

    resolveB({ data: { data: { active: 0 } } })
    await click
    await flushPromises()

    expect(messages.warning).toHaveBeenCalledWith('visualTheme.designRequired')
    expect(messages.warning).not.toHaveBeenCalledWith('visualTheme.dynamicRuleConflict')
  })

  it('ignores duplicate enable events while the rule lookup is pending', async () => {
    let resolveRule!: (value: unknown) => void
    themeApi.getThemeRuleDetail.mockReturnValue(new Promise((resolve) => {
      resolveRule = resolve
    }))
    const baseStore = useBaseStore()
    baseStore.appId = 42
    baseStore.generateConfig = vi.fn(() => null)
    const wrapper = mountPanel()

    await wrapper.find('.theme-switch').trigger('click')
    await wrapper.find('.theme-switch').trigger('click')
    resolveRule({ data: { data: null } })
    await flushPromises()

    expect(baseStore.generateConfig).toHaveBeenCalledTimes(1)
    expect(useVisualThemeStore().config).toBeUndefined()
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

  it('does not expose color ownership controls', () => {
    const store = useVisualThemeStore()
    store.hydrate(config())
    const propertiesStore = usePropertiesStore()
    propertiesStore.loadProperties({
      Accent: { type: 'color', title: 'Accent', value: '0x123456', themeMode: 'user' },
    })
    const wrapper = mountPanel()

    expect(wrapper.find('[data-color-owner="Accent"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('visualTheme.colorOwnerUser')
    expect(wrapper.text()).not.toContain('visualTheme.colorOwnerTheme')
  })
})
