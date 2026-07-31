// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePropertiesStore } from '@/stores/properties'
import { useVisualThemeStore } from '@/stores/visualThemeStore'
import { getColorPropertyValue, setColorPropertyValue } from './colorPropertyValueService'
import { syncColorPropertyToBoundElements } from './colorPropertySyncService'

vi.mock('./colorPropertySyncService', () => ({
  syncColorPropertyToBoundElements: vi.fn().mockResolvedValue(0),
}))

const themes = (enabled = true) => ({
  version: 1 as const,
  enabled,
  defaultThemeId: 'day',
  selectionMode: 'user' as const,
  themes: [
    { id: 'day', name: 'Day', assets: {}, colors: { Accent: '0x123456' } },
    { id: 'night', name: 'Night', assets: {}, colors: { Accent: '0x654321' } },
  ],
})

describe('setColorPropertyValue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(syncColorPropertyToBoundElements).mockClear()
    usePropertiesStore().addProperty({
      key: 'Accent',
      type: 'color',
      title: 'Accent',
      defaultValue: '0x123456',
      options: [],
    })
  })

  it('updates only the selected theme when visual themes are enabled', async () => {
    const propertiesStore = usePropertiesStore()
    const visualThemeStore = useVisualThemeStore()
    visualThemeStore.hydrate(themes())
    visualThemeStore.setPreviewTheme('night')

    await setColorPropertyValue('Accent', '#ABCDEF')

    expect(visualThemeStore.requireTheme('night').colors?.Accent).toBe('0xABCDEF')
    expect(visualThemeStore.requireTheme('day').colors?.Accent).toBe('0x123456')
    expect(propertiesStore.getPropertyValue('Accent')).toBe('0x123456')
    expect(syncColorPropertyToBoundElements).toHaveBeenCalledWith('Accent', '#ABCDEF')
    expect(getColorPropertyValue('Accent')).toBe('0xABCDEF')
  })

  it('falls back to the default theme when no preview theme is selected', async () => {
    const propertiesStore = usePropertiesStore()
    const visualThemeStore = useVisualThemeStore()
    visualThemeStore.hydrate(themes())
    visualThemeStore.previewThemeId = null

    await setColorPropertyValue('Accent', '#ABCDEF')

    expect(visualThemeStore.requireTheme('day').colors?.Accent).toBe('0xABCDEF')
    expect(visualThemeStore.requireTheme('night').colors?.Accent).toBe('0x654321')
    expect(propertiesStore.getPropertyValue('Accent')).toBe('0x123456')
  })

  it('updates the global default when visual themes are disabled', async () => {
    const propertiesStore = usePropertiesStore()
    const visualThemeStore = useVisualThemeStore()
    visualThemeStore.hydrate(themes(false))

    await setColorPropertyValue('Accent', '#ABCDEF')

    expect(propertiesStore.getPropertyValue('Accent')).toBe('#ABCDEF')
    expect(visualThemeStore.requireTheme('day').colors?.Accent).toBe('0x123456')
    expect(syncColorPropertyToBoundElements).toHaveBeenCalledWith('Accent', '#ABCDEF')
    expect(getColorPropertyValue('Accent')).toBe('#ABCDEF')
  })

  it('does not mutate the global default when the selected theme is invalid', async () => {
    const propertiesStore = usePropertiesStore()
    const visualThemeStore = useVisualThemeStore()
    visualThemeStore.hydrate(themes())
    visualThemeStore.previewThemeId = 'missing'

    await expect(setColorPropertyValue('Accent', '#ABCDEF'))
      .rejects.toThrow('visualTheme.themeNotFound')

    expect(propertiesStore.getPropertyValue('Accent')).toBe('0x123456')
    expect(visualThemeStore.requireTheme('day').colors?.Accent).toBe('0x123456')
    expect(syncColorPropertyToBoundElements).not.toHaveBeenCalled()
  })
})
