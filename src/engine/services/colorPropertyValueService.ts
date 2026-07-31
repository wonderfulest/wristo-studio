import { usePropertiesStore } from '@/stores/properties'
import { useVisualThemeStore } from '@/stores/visualThemeStore'
import { syncColorPropertyToBoundElements } from './colorPropertySyncService'

export const getColorPropertyValue = (propertyKey: string): unknown => {
  const propertiesStore = usePropertiesStore()
  const visualThemeStore = useVisualThemeStore()

  if (visualThemeStore.config?.enabled) {
    const themeId = visualThemeStore.currentWritableThemeId()
    return visualThemeStore.requireTheme(themeId).colors?.[propertyKey]
      ?? propertiesStore.getPropertyValue(propertyKey)
  }

  return propertiesStore.getPropertyValue(propertyKey)
}

export const setColorPropertyValue = async (
  propertyKey: string,
  color: unknown,
): Promise<void> => {
  const propertiesStore = usePropertiesStore()
  const visualThemeStore = useVisualThemeStore()

  if (visualThemeStore.config?.enabled) {
    const themeId = visualThemeStore.currentWritableThemeId()
    visualThemeStore.updateColor(themeId, propertyKey, String(color))
  } else {
    propertiesStore.setPropertyValue(propertyKey, color)
  }

  await syncColorPropertyToBoundElements(propertyKey, color)
}
