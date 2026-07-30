// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useVisualThemeStore } from '@/stores/visualThemeStore'
import type { VisualThemesConfig } from '@/types/visualTheme'
import VisualThemeQuickSelect from './VisualThemeQuickSelect.vue'

const appMenuSource = readFileSync('src/components/layout/AppMenu.vue', 'utf8')

const ElDropdown = {
  template: '<div><slot /><div class="dropdown"><slot name="dropdown" /></div></div>',
}
const ElDropdownMenu = { template: '<div><slot /></div>' }
const ElDropdownItem = {
  props: ['command', 'divided'],
  template: '<button type="button"><slot /></button>',
}
const ElIcon = { template: '<i><slot /></i>' }
const icon = { template: '<span />' }
const stubs = {
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem,
  ElIcon,
  ArrowDown: icon,
  Brush: icon,
  Check: icon,
  Edit: icon,
}

const enabledConfig = (): VisualThemesConfig => ({
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

const mountSelect = () => mount(VisualThemeQuickSelect, { global: { stubs } })

describe('VisualThemeQuickSelect', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows the current preview and marks the configured default', () => {
    const store = useVisualThemeStore()
    store.hydrate(enabledConfig())
    store.setPreviewTheme('night')
    const wrapper = mountSelect()

    expect(wrapper.get('[data-visual-theme-trigger]').text()).toContain('Night')
    expect(wrapper.get('[data-theme-option="night"]').classes()).toContain('is-selected')
    expect(wrapper.get('[data-theme-default="day"]').text()).toBe('Default')
  })

  it('switches preview state without changing the default theme', async () => {
    const store = useVisualThemeStore()
    store.hydrate(enabledConfig())
    const wrapper = mountSelect()

    ;(wrapper.vm as any).handleCommand('night')
    await wrapper.vm.$nextTick()

    expect(store.previewThemeId).toBe('night')
    expect(store.config?.defaultThemeId).toBe('day')
  })

  it('falls back to the default theme when the preview id is stale', () => {
    const store = useVisualThemeStore()
    store.hydrate(enabledConfig())
    store.previewThemeId = 'missing'
    const wrapper = mountSelect()

    expect(wrapper.get('[data-visual-theme-trigger]').text()).toContain('Day')
    expect(wrapper.get('[data-theme-option="day"]').classes()).toContain('is-selected')
  })

  it('only offers editing when visual themes are disabled', () => {
    const store = useVisualThemeStore()
    const config = enabledConfig()
    config.enabled = false
    store.hydrate(config)
    const wrapper = mountSelect()

    expect(wrapper.find('[data-theme-option]').exists()).toBe(false)
    expect(wrapper.get('[data-theme-enable-edit]').text()).toContain('Enable and edit visual themes')
  })

  it('emits edit for both edit commands', () => {
    const wrapper = mountSelect()

    ;(wrapper.vm as any).handleCommand('__edit__')

    expect(wrapper.emitted('edit')).toHaveLength(1)
  })

  it('replaces the old drawer-only menu entry in AppMenu', () => {
    expect(appMenuSource).toContain('<VisualThemeQuickSelect @edit="openVisualThemeEditor" />')
    expect(appMenuSource).toContain('useVisualThemePreview()')
    expect(appMenuSource).not.toContain('index="actions/visualThemes"')
    expect(appMenuSource).not.toContain('@closed="restoreVisualThemePreview"')
  })
})
