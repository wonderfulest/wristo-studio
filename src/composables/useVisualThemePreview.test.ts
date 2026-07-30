// @vitest-environment jsdom
import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBaseStore } from '@/stores/baseStore'
import { usePropertiesStore } from '@/stores/properties'
import { useVisualThemeStore } from '@/stores/visualThemeStore'
import type { VisualThemesConfig } from '@/types/visualTheme'
import { useVisualThemePreview } from './useVisualThemePreview'

const controller = vi.hoisted(() => ({
  preview: vi.fn().mockResolvedValue(undefined),
  restore: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn().mockResolvedValue(undefined),
}))
const captured = vi.hoisted(() => ({ dependencies: null as any }))
const messages = vi.hoisted(() => ({ error: vi.fn() }))

vi.mock('@/engine/services/visualThemePreviewService', () => ({
  createVisualThemePreviewController: (dependencies: any) => {
    captured.dependencies = dependencies
    return controller
  },
}))
vi.mock('element-plus', () => ({
  ElMessage: { error: messages.error },
}))
vi.mock('@/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const Harness = defineComponent({
  setup() {
    useVisualThemePreview()
    return () => null
  },
})

const config = (): VisualThemesConfig => ({
  version: 1,
  enabled: true,
  defaultThemeId: 'day',
  selectionMode: 'user',
  themes: [{
    id: 'day',
    name: 'Day',
    assets: {},
    colors: {},
    fallbackHands: { hourColor: '0xFFFFFF', minuteColor: '0xFFFFFF', secondColor: '0xFF0000' },
  }],
})

describe('useVisualThemePreview', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    controller.preview.mockClear()
    controller.restore.mockClear()
    controller.reset.mockClear()
    messages.error.mockClear()
    captured.dependencies = null
  })

  it('applies enabled preview state and restores when disabled', async () => {
    const wrapper = mount(Harness)
    const store = useVisualThemeStore()
    const propertiesStore = usePropertiesStore()
    store.hydrate(config())
    await nextTick()

    expect(controller.preview).toHaveBeenLastCalledWith(
      store.config,
      'day',
      propertiesStore.allProperties,
    )

    store.disable()
    await nextTick()
    expect(controller.restore).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('reapplies the active preview when its theme color changes', async () => {
    const wrapper = mount(Harness)
    const store = useVisualThemeStore()
    store.hydrate(config())
    await nextTick()
    controller.preview.mockClear()

    store.config!.themes[0].colors.Accent = '0x00FF00'
    await nextTick()

    expect(controller.preview).toHaveBeenCalledTimes(1)
    expect(controller.preview).toHaveBeenCalledWith(
      store.config,
      'day',
      usePropertiesStore().allProperties,
    )
    wrapper.unmount()
  })

  it('resets the controller when the design identity changes', async () => {
    const wrapper = mount(Harness)
    useBaseStore().id = '99'
    await nextTick()

    expect(controller.reset).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('reports preview errors with the existing localized message', () => {
    const wrapper = mount(Harness)
    captured.dependencies.onError()

    expect(messages.error).toHaveBeenCalledWith('visualTheme.previewFailed')
    wrapper.unmount()
  })
})
