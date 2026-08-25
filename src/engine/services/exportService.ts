import { ElMessage } from 'element-plus'
import type { Canvas } from 'fabric'
import type { DataOptionsMap, PropertiesMap } from '@/types/properties'
import type { DataTypeOption } from '@/types/dataCatalog'
import type { RuntimeDesignConfig } from '@/types/app/config'
import type { AnyElementConfig } from '@/types/elements'
import { encodeElementByRegistry } from '@/engine/registry/elementRegistry'
import { normalizeFontSizeFields } from '@/utils/fontSize'
import type { FabricElement } from '@/types/element'
import { normalizeConnectIqSettingsExcludedDataTypeValues, useDesignStore } from '@/stores/designStore'
import { useLocaleStore } from '@/stores/locale'
import { translate } from '@/i18n'
import { normalizeConfigToStandardSize } from '@/utils/designScale'
import { isDefaultBackgroundElement } from '@/elements/decoration/background/background.constants'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import type { WatchfaceLocalizationConfig } from '@/types/localization'
import { normalizeDataNumberFormatMode, normalizeMaxFieldLength } from '@/utils/dataNumberFormat'
import { getFontBySlug } from '@/api/wristo/fonts'
import { useFontStore } from '@/stores/fontStore'
import { canonicalFontSlug } from '@/features/bitmap-font-maker/fontSlug'
import {
  getDateContentLanguage,
  getDateFontRequirementLabel,
  isDateFormatAllowedByChineseSupport,
  isFontCompatibleWithDateLanguage,
} from '@/utils/dateFontCompatibility'
import { validateDataGoalBindings } from '@/engine/services/propertyBindingValidation'
import { toPlainRuntimeConfig } from '@/engine/services/runtimeConfigSerialization'
import { validateVisualThemes } from '@/engine/services/visualThemeService'
import type { VisualThemesConfig, VisualThemeAssetSlot } from '@/types/visualTheme'
import {
  VISUAL_THEME_ASSET_BASE_FIELDS,
  VISUAL_THEME_ASSET_ELEMENT_TYPES,
  VISUAL_THEME_COLOR_BINDINGS,
} from './visualThemeElementFields'
import { validateExplicitColorBindings } from './explicitColorBindingService'
import { serializeDataPropertyConfig } from './dataPropertyConfig'
import { validateSunEventsElement } from '@/elements/sunEvents/common/sunEvents.validation'
import { validateVisibilityExpression } from '@/engine/expression/validation'
import { validateDynamicImage } from '@/elements/decoration/dynamicImage/dynamicImage.validation'
import { calculateConnectIqSettingsBudget } from './connectIqSettingsBudget'
import { resolveDatePropertyConfig } from './datePropertyConfig'
import { validateCustomDateTemplate } from '@/elements/time/date/dateTemplate'
import type { HorizontalLayoutGroupConfig } from '@/types/layoutGroup'
import { normalizeAndValidateLayoutGroups } from '@/engine/layout/layoutGroupValidation'

const t = (key: string, params?: Record<string, string | number>): string => {
  const localeStore = useLocaleStore()
  return translate(key, localeStore.currentLocale, params)
}

const PACKAGE_ASSET_ELEMENT_TYPES = new Set(['hourHand', 'minuteHand', 'secondHand', 'rotatingHand', 'centerCap'])

function normalizeTransparentColors(encodeConfig: AnyElementConfig): void {
  const record = encodeConfig as unknown as Record<string, unknown>
  for (const [colorField] of VISUAL_THEME_COLOR_BINDINGS) {
    if (record[colorField] === 'transparent') record[colorField] = -1
  }
}

function isPackageAssetElement(element: AnyElementConfig): boolean {
  return PACKAGE_ASSET_ELEMENT_TYPES.has(String((element as any)?.eleType ?? (element as any)?.type ?? ''))
}

function readNumericAssetId(element: AnyElementConfig): number | null {
  const assetId = (element as any)?.assetId
  if (typeof assetId === 'number' && Number.isFinite(assetId)) return assetId
  if (typeof assetId === 'string' && /^\d+$/.test(assetId)) return Number(assetId)
  return null
}

export async function resolvePackageAssetUrls(config: RuntimeDesignConfig | null): Promise<RuntimeDesignConfig | null> {
  if (!config) return config

  const assetUrlById = new Map<number, Promise<string>>()
  const resolveAnalogAssetUrl = (assetId: number): Promise<string> => {
    let pending = assetUrlById.get(assetId)
    if (!pending) {
      pending = analogAssetApi.get(assetId).then((res) => {
        const fileUrl = res.data?.file?.url || ''
        if (!fileUrl) throw new Error(`Analog asset ${assetId} has no file URL`)
        return fileUrl
      })
      assetUrlById.set(assetId, pending)
    }
    return pending
  }
  const elements = await Promise.all((config.elements || []).map(async (element) => {
    if (!isPackageAssetElement(element)) return element

    const assetId = readNumericAssetId(element)
    if (!assetId) return element

    const fileUrl = await resolveAnalogAssetUrl(assetId)

    return {
      ...(element as any),
      imageUrl: fileUrl,
    } as AnyElementConfig
  }))

  const analogSlots: VisualThemeAssetSlot[] = ['hourHand', 'minuteHand', 'secondHand', 'centerCap']
  const visualThemes = config.visualThemes
    ? {
        ...config.visualThemes,
        themes: await Promise.all(config.visualThemes.themes.map(async (theme) => {
          const assets = { ...theme.assets }
          await Promise.all(analogSlots.map(async (slot) => {
            const asset = assets[slot]
            const assetId = readNumericAssetId(asset as AnyElementConfig)
            if (!asset || !assetId) return
            assets[slot] = { ...asset, imageUrl: await resolveAnalogAssetUrl(assetId) }
          }))
          return { ...theme, assets }
        })),
      }
    : undefined

  return {
    ...config,
    elements,
    ...(visualThemes ? { visualThemes } : {}),
  }
}

/**
 * 校验颜色属性：每个颜色属性的值必须在至少一个元素的颜色设置中被引用
 * 仅检查编码后元素上的显式 *Property 目标字段
 */
function validateColorBindings(
  encodedElements: AnyElementConfig[],
  properties: PropertiesMap,
): string[] {
  const errors: string[] = []

  const colorTargets = VISUAL_THEME_COLOR_BINDINGS.map(([, target]) => target)

  for (const [key, prop] of Object.entries(properties)) {
    if (prop.type !== 'color') continue

    const bound = encodedElements.some((enc) => {
      const rec = enc as unknown as Record<string, unknown>
      return colorTargets.some((target) => rec[target] === key)
    })

    if (!bound) {
      errors.push(t('export.validation.unusedColorProperty', { title: prop.title, key }))
    }
  }

  return errors
}

async function resolveFontForValidation(slug: string) {
  const fontStore = useFontStore()
  const local = [
    ...(fontStore.allFonts as any[]),
    ...(fontStore.recentFonts as any[]),
  ].find((font) => font?.value === slug || font?.slug === slug)
  if (local) return local

  const cacheKey = canonicalFontSlug(slug)
  const cached = fontStore.serverFonts.get(cacheKey)
  if (cached) return cached

  try {
    const res = await getFontBySlug(slug)
    if (res.data) {
      fontStore.serverFonts.set(cacheKey, res.data)
      return res.data
    }
  } catch {}
  return null
}

async function validateDateContentAndFonts(
  elements: AnyElementConfig[],
  supportsChineseContent: boolean,
): Promise<string[]> {
  const errors: string[] = []

  for (const element of elements) {
    const eleType = String((element as any)?.eleType ?? (element as any)?.type ?? '')
    if (eleType !== 'date') continue

    const formatter = Number((element as any).formatter ?? 0)
    const customTemplate = (element as any).dateFormatMode === 'custom'
      ? String((element as any).dateTemplate ?? '')
      : ''
    if (customTemplate) {
      const templateErrors = validateCustomDateTemplate(customTemplate)
      if (templateErrors.length > 0) {
        errors.push(...templateErrors)
        continue
      }
      if (!supportsChineseContent && /\(cn[0-9.]+\)/.test(customTemplate)) {
        errors.push('Chinese date tokens require Chinese content support to be enabled.')
        continue
      }
    } else if (!isDateFormatAllowedByChineseSupport(formatter, supportsChineseContent)) {
      errors.push('Chinese date formats require Chinese content support to be enabled.')
      continue
    }

    const fontFamily = String((element as any).fontFamily || '')
    if (!fontFamily) {
      errors.push('A date element is missing a font.')
      continue
    }

    const language = customTemplate && /\(cn[0-9.]+\)/.test(customTemplate)
      ? 'zh'
      : getDateContentLanguage(formatter)
    const font = await resolveFontForValidation(fontFamily)
    if (!font) {
      errors.push(`Cannot verify the date font "${fontFamily}". Please choose a compatible font again.`)
      continue
    }
    if (!isFontCompatibleWithDateLanguage(font, language)) {
      errors.push(`Date format requires a ${getDateFontRequirementLabel(language)}. Please choose a compatible font for "${fontFamily}".`)
    }
  }

  return Array.from(new Set(errors))
}

export interface GenerateConfigOptions {
  canvas: Canvas | null
  properties: PropertiesMap
  dataOptions?: DataOptionsMap
  catalogOptions?: readonly DataTypeOption[]
  designId: string
  watchFaceName: string
  textCase: number
  bitmapMode: boolean
  dataNumberFormat?: number
  maxFieldLength?: number
  localization?: WatchfaceLocalizationConfig
  visualThemes?: VisualThemesConfig
  layoutGroups?: HorizontalLayoutGroupConfig[]
  validateBindings?: boolean
  baseElements?: Array<Record<string, any>>
  connectIqSettingsExcludedDataTypeValues?: unknown
}

function restoreVisualThemeBaseFields(
  encoded: AnyElementConfig,
  base: Record<string, any> | undefined,
): AnyElementConfig {
  if (!base) return encoded
  const output = encoded as unknown as Record<string, any>
  const eleType = String(output.eleType ?? base.eleType ?? '')
  const assetSlot = (Object.entries(VISUAL_THEME_ASSET_ELEMENT_TYPES)
    .find(([, assetElementType]) => assetElementType === eleType)?.[0]) as VisualThemeAssetSlot | undefined
  if (assetSlot) {
    for (const field of VISUAL_THEME_ASSET_BASE_FIELDS[assetSlot] || []) {
      if (Object.prototype.hasOwnProperty.call(base, field)) output[field] = base[field]
    }
  }
  for (const [colorField, propertyField] of VISUAL_THEME_COLOR_BINDINGS) {
    if (typeof base[propertyField] !== 'string') continue
    if (Object.prototype.hasOwnProperty.call(base, colorField)) output[colorField] = base[colorField]
    output[propertyField] = base[propertyField]
  }
  return encoded
}

export async function validateRuntimeConfigForExport(config: RuntimeDesignConfig): Promise<boolean> {
  const dateErrors = await validateDateContentAndFonts(
    config.elements,
    config.localization?.appLanguage === 'zhs',
  )
  const visualThemeErrors = validateVisualThemes(
    config.visualThemes,
    config.properties,
    config.elements as unknown as Array<Record<string, unknown>>,
  )
  const settingsBudget = calculateConnectIqSettingsBudget({
    properties: config.properties,
    dataOptions: config.dataOptions,
    elements: config.elements as unknown as Array<Record<string, unknown>>,
    appLanguage: config.localization?.appLanguage,
    visualThemes: config.visualThemes,
  })
  if (settingsBudget.status === 'exceeded') {
    if (typeof document !== 'undefined') {
      ElMessage.warning(t('property.budgetExceeded'))
    }
  }
  const errors = [...dateErrors, ...visualThemeErrors]
  if (errors.length > 0) {
    if (typeof document !== 'undefined') {
      ElMessage.error(errors.join(t('common.listSeparator')))
    }
    console.error('Export validation failed:', errors)
    return false
  }
  return true
}

export function generateConfig(options: GenerateConfigOptions): RuntimeDesignConfig | null {
  const {
    canvas,
    properties,
    dataOptions = {},
    catalogOptions = [],
    designId,
    watchFaceName,
    textCase,
    bitmapMode,
    dataNumberFormat,
    maxFieldLength,
    localization,
    visualThemes,
    layoutGroups,
    connectIqSettingsExcludedDataTypeValues,
    validateBindings = false,
    baseElements = [],
  } = options
  const baseElementById = new Map((visualThemes?.enabled ? baseElements : [])
    .filter((element) => element?.id != null)
    .map((element) => [String(element.id), element]))

  if (!canvas || !canvas.getObjects().length) {
    return null
  }

  const normalizedDataProperties = serializeDataPropertyConfig(
    properties,
    dataOptions,
    catalogOptions,
  )
  if (normalizedDataProperties.issues.length > 0) {
    const errors = normalizedDataProperties.issues.map((issue) => (
      `${issue.path}: ${issue.code}${issue.metricSymbol ? ` (${issue.metricSymbol})` : ''}`
    ))
    if (typeof document !== 'undefined') {
      ElMessage.error(errors.join(t('common.listSeparator')))
    }
    console.error('Export validation failed:', normalizedDataProperties.issues)
    return null
  }

  const config: RuntimeDesignConfig = {
    version: '1.0',
    properties: normalizedDataProperties.properties,
    dataOptions: normalizedDataProperties.dataOptions,
    designId: designId || '',
    name: watchFaceName,
    textCase,
    bitmapMode,
    dataNumberFormat: normalizeDataNumberFormatMode(dataNumberFormat),
    maxFieldLength: normalizeMaxFieldLength(maxFieldLength),
    connectIqSettingsExcludedDataTypeValues: normalizeConnectIqSettingsExcludedDataTypeValues(
      connectIqSettingsExcludedDataTypeValues,
    ),
    elements: [],
    orderIds: [],
  }
  if (localization) {
    config.localization = localization
  }
  if (visualThemes) {
    config.visualThemes = toPlainRuntimeConfig({
      ...config,
      visualThemes,
    }).visualThemes
  }

  const objects: FabricElement[] = canvas.getObjects() as FabricElement[]

  // ── 导出前校验：数据属性 / 目标属性必须绑定到元素 ──
  if (validateBindings) {
    const bindingErrors = validateDataGoalBindings(objects, properties, t)
    if (bindingErrors.length > 0) {
      ElMessage.error(bindingErrors.join(t('common.listSeparator')))
      console.error('Export validation failed:', bindingErrors)
      return null
    }
  }

  let imageId = 0,
    timeId = 0,
    dateId = 0,
    subItemId = 0

  // 用户上传的背景元素放在 elements[0]；系统默认黑色 SVG 仅用于画布显示，不导出。
  const bgObj = objects.find((o) => (o as any)?.eleType === 'background')
  if (bgObj && !isDefaultBackgroundElement(bgObj)) {
    try {
      const encoded = encodeElementByRegistry(bgObj) as AnyElementConfig | null
      if (encoded) {
        restoreVisualThemeBaseFields(encoded, baseElementById.get(String((encoded as any).id)))
        normalizeTransparentColors(encoded)
        config.elements.unshift(encoded)
      }
    } catch (err) {
      console.error('Failed to encode background element with exception:', bgObj, err)
      const message = (err as Error)?.message || 'Encode background element failed'
      ElMessage.error(message)
      return null
    }
  }

  try {
    for (const element of objects) {
      if ((element as any).excludeFromExport) continue
      if (!(element as any).eleType) continue

      const eleType = String((element as any).eleType)
      // 背景已在 elements[0] 处理，这里跳过避免重复
      if (eleType === 'background' || eleType === 'global') {
        continue
      }
      if (eleType === 'image' && !String((element as any).imageUrl ?? '').trim()) {
        continue
      }

      const elementId = (element as any).id
      if (elementId != null && elementId !== '') {
        config.orderIds.push(String(elementId))
      }

      let encodeConfig: AnyElementConfig | null = null
      try {
        encodeConfig = encodeElementByRegistry(element) as AnyElementConfig | null
      } catch (err) {
        console.error('Failed to encode element with exception:', element, err)
        const message = (err as Error)?.message || 'Encode element failed'
        ElMessage.error(message)
        return null
      }
      if (!encodeConfig) {
        console.error('Failed to encode element:', element)
        return null
      }
      if (eleType === 'date') {
        Object.assign(encodeConfig, resolveDatePropertyConfig(encodeConfig as any, properties))
      }

      const visibilityErrors = validateVisibilityExpression((encodeConfig as any).visibility)
      if (visibilityErrors.length > 0) {
        if (typeof document !== 'undefined') {
          ElMessage.error(visibilityErrors.join(t('common.listSeparator')))
        }
        console.error('Export validation failed:', visibilityErrors)
        return null
      }
      if (eleType === 'dynamicImage') {
        const errors = validateDynamicImage(encodeConfig as any)
        if (errors.length) {
          if (typeof document !== 'undefined') ElMessage.error(errors.join(t('common.listSeparator')))
          console.error('Export validation failed:', errors)
          return null
        }
      }

      const sunEventsError = validateSunEventsElement(encodeConfig as unknown as Record<string, any>)
      if (sunEventsError) {
        ElMessage.error(sunEventsError)
        console.error('Export validation failed:', sunEventsError)
        return null
      }

      restoreVisualThemeBaseFields(encodeConfig, baseElementById.get(String((encodeConfig as any).id)))
      normalizeTransparentColors(encodeConfig)
      const mutable: Record<string, unknown> = encodeConfig as unknown as Record<string, unknown>
      const idCarrier = mutable as Partial<Record<'imageId' | 'timeId' | 'dateId' | 'subItemId', number>>
      if ((element as any).eleType === 'image' || (element as any).eleType === 'dynamicImage') {
        idCarrier.imageId = imageId++
      }
      if ((element as any).eleType === 'dynamicImage') {
        const dynamic = encodeConfig as any
        dynamic.items = dynamic.items.map((item: any) => ({ ...item, imageId: imageId++ }))
      }
      if ((element as any).eleType === 'time') {
        idCarrier.timeId = timeId++
      }
      if ((element as any).eleType === 'date') {
        idCarrier.dateId = dateId++
      }
      if (
        (encodeConfig as any).eleType == 'romans' ||
        (encodeConfig as any).eleType == 'tick12' ||
        (encodeConfig as any).eleType == 'tick60'
      ) {
        idCarrier.subItemId = subItemId++
      }

      config.elements.push(encodeConfig)
    }

    // ── 导出前校验：颜色属性的值必须在元素的颜色设置中被引用 ──
    if (validateBindings) {
      const invalidBindings = validateExplicitColorBindings(config.elements, properties)
      if (invalidBindings.length > 0) {
        const errors = invalidBindings.map((binding) =>
          t('export.validation.invalidColorPropertyBinding', {
            key: binding.propertyKey,
            elementId: binding.elementId,
          }))
        ElMessage.error(errors.join(t('common.listSeparator')))
        console.error('Export validation failed:', invalidBindings)
        return null
      }
      const colorErrors = validateColorBindings(config.elements, properties)
      if (colorErrors.length > 0) {
        ElMessage.error(colorErrors.join(t('common.listSeparator')))
        console.error('Export validation failed:', colorErrors)
        return null
      }
    }

    if (layoutGroups) {
      config.layoutGroups = normalizeAndValidateLayoutGroups(layoutGroups, config.elements)
    }

    const designStore = useDesignStore()
    const normalizedConfig = normalizeConfigToStandardSize(config, {
      width: Number(designStore.designSpec.width || 454),
      height: Number(designStore.designSpec.height || 454),
    })
    return toPlainRuntimeConfig({
      ...normalizedConfig,
      elements: normalizedConfig.elements.map((element) =>
        normalizeFontSizeFields(element as unknown as Record<string, unknown>) as unknown as AnyElementConfig,
      ),
    })
  } catch (err) {
    console.error('Generate config failed:', err)
    const message = (err as Error)?.message || 'Failed to generate configuration'
    if (typeof document !== 'undefined') ElMessage.error(message)
    return null
  }
}
