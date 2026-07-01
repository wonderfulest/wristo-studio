import { ElMessage } from 'element-plus'
import type { Canvas } from 'fabric'
import type { PropertiesMap } from '@/types/properties'
import type { RuntimeDesignConfig } from '@/types/app/config'
import type { AnyElementConfig } from '@/types/elements'
import { encodeElementByRegistry } from '@/engine/registry/elementRegistry'
import { normalizeFontSizeFields } from '@/utils/fontSize'
import type { FabricElement } from '@/types/element'
import { useDesignStore } from '@/stores/designStore'
import { useLocaleStore } from '@/stores/locale'
import { translate } from '@/i18n'
import { normalizeConfigToStandardSize } from '@/utils/designScale'
import { isDefaultBackgroundElement } from '@/elements/decoration/background/background.constants'
import { analogAssetApi } from '@/api/wristo/analogAsset'
import type { WatchfaceLocalizationConfig } from '@/types/localization'
import { getFontBySlug } from '@/api/wristo/fonts'
import { useFontStore } from '@/stores/fontStore'
import {
  getDateContentLanguage,
  getDateFontRequirementLabel,
  isDateFormatAllowedByChineseSupport,
  isFontCompatibleWithDateLanguage,
} from '@/utils/dateFontCompatibility'

const t = (key: string, params?: Record<string, string | number>): string => {
  const localeStore = useLocaleStore()
  return translate(key, localeStore.currentLocale, params)
}

const PACKAGE_ASSET_ELEMENT_TYPES = new Set(['hourHand', 'minuteHand', 'secondHand'])

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
  if (!config?.elements?.length) return config

  const assetUrlById = new Map<number, string>()
  const elements = await Promise.all(config.elements.map(async (element) => {
    if (!isPackageAssetElement(element)) return element

    const assetId = readNumericAssetId(element)
    if (!assetId) return element

    let fileUrl = assetUrlById.get(assetId)
    if (!fileUrl) {
      const res = await analogAssetApi.get(assetId)
      fileUrl = res.data?.file?.url || ''
      if (!fileUrl) {
        throw new Error(`Analog asset ${assetId} has no file URL`)
      }
      assetUrlById.set(assetId, fileUrl)
    }

    return {
      ...(element as any),
      imageUrl: fileUrl,
    } as AnyElementConfig
  }))

  return {
    ...config,
    elements,
  }
}

function mapColorProperties(encodeConfig: AnyElementConfig, properties: PropertiesMap): void {
  const colorMappings: Array<{ source: string; target: string }> = [
    { source: 'color', target: 'colorProperty' },
    { source: 'bgColor', target: 'bgColorProperty' },
    { source: 'stroke', target: 'strokeProperty' },
    { source: 'borderColor', target: 'borderColorProperty' },
    { source: 'bodyStroke', target: 'bodyStrokeProperty' },
    { source: 'headFill', target: 'headFillProperty' },
    { source: 'bodyFill', target: 'bodyFillProperty' },
    { source: 'fill', target: 'fillProperty' },
    { source: 'activeColor', target: 'activeColorProperty' },
    { source: 'inactiveColor', target: 'inactiveColorProperty' },
    { source: 'pointColor', target: 'pointColorProperty' },
    { source: 'gridColor', target: 'gridColorProperty' },
    { source: 'xAxisColor', target: 'xAxisColorProperty' },
    { source: 'yAxisColor', target: 'yAxisColorProperty' },
    { source: 'xLabelColor', target: 'xLabelColorProperty' },
    { source: 'yLabelColor', target: 'yLabelColorProperty' },
    { source: 'levelColorHigh', target: 'levelColorHighProperty' },
    { source: 'levelColorMedium', target: 'levelColorMediumProperty' },
    { source: 'levelColorLow', target: 'levelColorLowProperty' },
  ]

  const encRec: Record<string, unknown> = encodeConfig as unknown as Record<string, unknown>
  for (const { source, target } of colorMappings) {
    const val = encRec[source]
    if (val === undefined) continue
    if (val === 'transparent') {
      encRec[source] = -1
      continue
    }
    const match = Object.entries(properties)
      .find(([, colorProperty]) => {
        if ((colorProperty as any).type !== 'color') return false
        const propVal = String((colorProperty as any).value ?? '')
        const srcVal = String(val ?? '')
        return propVal.toLowerCase().slice(-6) === srcVal.toLowerCase().slice(-6)
      })
    if (match) {
      encRec[target] = match[0]
    }
  }
}

/**
 * 校验数据属性和目标属性：每个属性必须被至少一个元素绑定
 */
function validateDataGoalBindings(
  objects: FabricElement[],
  properties: PropertiesMap,
): string[] {
  const errors: string[] = []
  const elements = objects.filter((o) => {
    const t = (o as any).eleType
    return t && t !== 'background' && t !== 'global'
  })

  for (const [key, prop] of Object.entries(properties)) {
    if (prop.type === 'data') {
      const bound = elements.some((o) => (o as any).dataProperty === key)
      if (!bound) {
        errors.push(t('export.validation.unboundDataProperty', { title: prop.title, key }))
      }
    }
    if (prop.type === 'goal') {
      const bound = elements.some((o) => (o as any).goalProperty === key)
      if (!bound) {
        errors.push(t('export.validation.unboundGoalProperty', { title: prop.title, key }))
      }
    }
    if (prop.type === 'chart') {
      const bound = elements.some((o) => (o as any).chartProperty === key)
      if (!bound) {
        errors.push(t('export.validation.unboundChartProperty', { title: prop.title, key }))
      }
    }
    if (prop.type === 'text') {
      const bound = elements.some((o) => (o as any).textProperty === key)
      if (!bound) {
        errors.push(t('export.validation.unboundTextProperty', { title: prop.title, key }))
      }
    }
  }

  return errors
}

/**
 * 校验颜色属性：每个颜色属性的值必须在至少一个元素的颜色设置中被引用
 * 需在 mapColorProperties 执行之后调用，检查编码后元素上的 *Property 目标字段
 */
function validateColorBindings(
  encodedElements: AnyElementConfig[],
  properties: PropertiesMap,
): string[] {
  const errors: string[] = []

  const colorTargets = [
    'colorProperty', 'bgColorProperty', 'strokeProperty', 'borderColorProperty',
    'bodyStrokeProperty', 'headFillProperty', 'bodyFillProperty', 'fillProperty',
    'activeColorProperty', 'inactiveColorProperty', 'pointColorProperty',
    'gridColorProperty', 'xAxisColorProperty', 'yAxisColorProperty',
    'xLabelColorProperty', 'yLabelColorProperty', 'levelColorHighProperty',
    'levelColorMediumProperty', 'levelColorLowProperty',
  ]

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

  const cached = fontStore.serverFonts.get(slug)
  if (cached) return cached

  try {
    const res = await getFontBySlug(slug)
    if (res.data) {
      fontStore.serverFonts.set(slug, res.data)
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
    if (!isDateFormatAllowedByChineseSupport(formatter, supportsChineseContent)) {
      errors.push('Chinese date formats require Chinese content support to be enabled.')
      continue
    }

    const fontFamily = String((element as any).fontFamily || '')
    if (!fontFamily) {
      errors.push('A date element is missing a font.')
      continue
    }

    const language = getDateContentLanguage(formatter)
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
  designId: string
  watchFaceName: string
  textCase: number
  localization?: WatchfaceLocalizationConfig
  supportsChineseContent?: boolean
  validateBindings?: boolean
}

export async function validateRuntimeConfigForExport(config: RuntimeDesignConfig): Promise<boolean> {
  const dateErrors = await validateDateContentAndFonts(
    config.elements,
    Boolean(config.supportsChineseContent),
  )
  if (dateErrors.length > 0) {
    ElMessage.error(dateErrors.join(t('common.listSeparator')))
    console.error('Export date validation failed:', dateErrors)
    return false
  }
  return true
}

export function generateConfig(options: GenerateConfigOptions): RuntimeDesignConfig | null {
  const {
    canvas,
    properties,
    designId,
    watchFaceName,
    textCase,
    localization,
    supportsChineseContent,
    validateBindings = false,
  } = options

  if (!canvas || !canvas.getObjects().length) {
    return null
  }

  const config: RuntimeDesignConfig = {
    version: '1.0',
    properties,
    designId: designId || '',
    name: watchFaceName,
    textCase,
    supportsChineseContent: Boolean(supportsChineseContent),
    elements: [],
    orderIds: [],
  }
  if (localization) {
    config.localization = localization
  }

  const objects: FabricElement[] = canvas.getObjects() as FabricElement[]

  // ── 导出前校验：数据属性 / 目标属性必须绑定到元素 ──
  if (validateBindings) {
    const bindingErrors = validateDataGoalBindings(objects, properties)
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
        mapColorProperties(encoded, properties)
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

      mapColorProperties(encodeConfig, properties)

      const mutable: Record<string, unknown> = encodeConfig as unknown as Record<string, unknown>
      const idCarrier = mutable as Partial<Record<'imageId' | 'timeId' | 'dateId' | 'subItemId', number>>
      if ((element as any).eleType === 'image') {
        idCarrier.imageId = imageId++
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
      const colorErrors = validateColorBindings(config.elements, properties)
      if (colorErrors.length > 0) {
        ElMessage.error(colorErrors.join(t('common.listSeparator')))
        console.error('Export validation failed:', colorErrors)
        return null
      }
    }

    const designStore = useDesignStore()
    const normalizedConfig = normalizeConfigToStandardSize(config, {
      width: Number(designStore.designSpec.width || 454),
      height: Number(designStore.designSpec.height || 454),
    })
    return {
      ...normalizedConfig,
      elements: normalizedConfig.elements.map((element) =>
        normalizeFontSizeFields(element as unknown as Record<string, unknown>) as unknown as AnyElementConfig,
      ),
    }
  } catch (err) {
    console.error('Generate config failed:', err)
    const message = (err as Error)?.message || 'Failed to generate configuration'
    ElMessage.error(message)
    return null
  }
}
