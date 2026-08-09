import { resolveGarminSystemFont } from '@/utils/garminSystemFonts'
import type { GarminSystemFontSelection } from '@/types/garminSystemFont'
import { useUserStore } from '@/stores/user'
import { useDesignStore } from '@/stores/designStore'

export interface GarminSystemFontPreviewConfig extends GarminSystemFontSelection {
  fontFamily?: string
  fontSize?: number
}

export interface GarminSystemFontPreviewContext {
  deviceId: string
  hardwarePartNumber?: string | null
  partNumber?: string | null
  locale: string
}

interface SystemFontCanvasObject extends GarminSystemFontSelection {
  fontFamily?: string
  fontSize?: number
  assetFontFamily?: string
  assetFontSize?: number
  set?: (values: Record<string, unknown>) => void
  initDimensions?: () => void
  setCoords?: () => void
  dirty?: boolean
}

export const resolveElementPreviewFont = (
  config: GarminSystemFontPreviewConfig,
  context: GarminSystemFontPreviewContext,
): Record<string, unknown> => {
  if (config.fontSource !== 'system' || !config.systemFont) {
    return { fontFamily: config.fontFamily, fontSize: config.fontSize }
  }
  const resolved = resolveGarminSystemFont({ ...context, symbol: config.systemFont })
  if (!resolved.supported || !resolved.browserFamily || resolved.size == null) {
    return {
      fontFamily: config.fontFamily,
      fontSize: config.fontSize,
      fontSource: 'system',
      systemFont: config.systemFont,
      systemFontError: resolved.reason,
    }
  }
  return {
    fontFamily: resolved.browserFamily,
    fontSize: resolved.size,
    assetFontFamily: config.fontFamily,
    assetFontSize: config.fontSize,
    fontSource: 'system',
    systemFont: config.systemFont,
    systemFontPrecision: resolved.precision,
    previewFontSlug: resolved.previewFontSlug,
  }
}

export const resolveCurrentElementPreviewFont = (config: GarminSystemFontPreviewConfig) => {
  const device = useUserStore().userInfo?.device
  const designStore = useDesignStore()
  return resolveElementPreviewFont(config, {
    deviceId: device?.deviceId || '',
    hardwarePartNumber: device?.hardwarePartNumber,
    partNumber: device?.partNumber,
    locale: designStore.defaultLocale,
  })
}

export const resolveSystemFontUpdate = (
  current: GarminSystemFontPreviewConfig & { assetFontFamily?: string; assetFontSize?: number },
  patch: Partial<GarminSystemFontPreviewConfig>,
  context: GarminSystemFontPreviewContext,
): Record<string, unknown> => {
  const next = { ...current, ...patch }
  if (next.fontSource !== 'system') {
    return {
      ...patch,
      fontSource: 'asset',
      systemFont: undefined,
      fontFamily: current.assetFontFamily ?? current.fontFamily,
      fontSize: current.assetFontSize ?? current.fontSize,
      assetFontFamily: undefined,
      assetFontSize: undefined,
      systemFontPrecision: undefined,
      previewFontSlug: undefined,
    }
  }

  const assetFontFamily = current.fontSource === 'system'
    ? current.assetFontFamily ?? current.fontFamily
    : current.fontFamily
  const assetFontSize = current.fontSource === 'system'
    ? current.assetFontSize ?? current.fontSize
    : current.fontSize
  return {
    ...patch,
    ...resolveElementPreviewFont({
      ...next,
      fontFamily: assetFontFamily,
      fontSize: assetFontSize,
    }, context),
  }
}

export const resolveCurrentSystemFontUpdate = (
  current: GarminSystemFontPreviewConfig & { assetFontFamily?: string; assetFontSize?: number },
  patch: Partial<GarminSystemFontPreviewConfig>,
) => {
  const device = useUserStore().userInfo?.device
  return resolveSystemFontUpdate(current, patch, {
    deviceId: device?.deviceId || '',
    hardwarePartNumber: device?.hardwarePartNumber,
    partNumber: device?.partNumber,
    locale: useDesignStore().defaultLocale,
  })
}

export const refreshGarminSystemFontPreviews = (
  objects: SystemFontCanvasObject[],
  context: GarminSystemFontPreviewContext,
): number => {
  let changed = 0
  objects.forEach((object) => {
    if (object.fontSource !== 'system' || !object.systemFont || !object.set) return
    const preview = resolveElementPreviewFont({
      fontSource: object.fontSource,
      systemFont: object.systemFont,
      fontFamily: object.assetFontFamily ?? object.fontFamily,
      fontSize: object.assetFontSize ?? object.fontSize,
    }, context)
    object.set(preview)
    object.initDimensions?.()
    object.setCoords?.()
    object.dirty = true
    changed += 1
  })
  return changed
}
