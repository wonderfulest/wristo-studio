import moment from 'moment'
import { Text as FabricText } from 'fabric'
import { nanoid } from 'nanoid'
import { DateFormatConstants, DateFormatOptions } from '@/config/settings'
import type { FabricElement } from '@/types/element'
import type { DateElementConfig } from '@/types/elements'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { formatChineseDatePreview } from '@/utils/chineseDatePreview'
import { useBaseStore } from '@/stores/baseStore'
import { usePropertiesStore } from '@/stores/properties'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import * as elementManager from '@/engine/managers/elementManager'
import { getSimulatedNow } from '@/engine/simulator/simulatedClock'
import { isChineseDateFormatter, normalizeDateFormatterForRuntimeLocale } from '@/utils/dateFontCompatibility'
import { useDesignStore } from '@/stores/designStore'
import type { ElementUpdateContext } from '@/engine/registry/elementRegistry'
import { applyCurrentElementPreviewFont, resolveCurrentElementPreviewFont } from '@/composables/useGarminSystemFont'
import { savedTextStyle } from '@/features/bitmap-font-maker/recipePreview'
import { resolveDesignEffectiveLocale } from '@/utils/effectiveDisplayLocale'
import { getPersistedTextFont } from '@/utils/systemFontElement'
import { resolveDatePropertyConfig } from '@/engine/services/datePropertyConfig'

function formatDate(date: Date, formatter: number, textCase: number | undefined, runtimeLocale: string): string {
  const normalizedFormatter = normalizeDateFormatterForRuntimeLocale(formatter, runtimeLocale)
  if (isChineseDateFormatter(normalizedFormatter)) {
    return formatChineseDatePreview(date, normalizedFormatter, runtimeLocale)
  }
  const normalizedLocale = String(runtimeLocale || '').trim().toLowerCase()
  const isChineseLocale = normalizedLocale === 'zh' || normalizedLocale === 'zh-cn' || normalizedLocale === 'zh-tw'
  if (isChineseLocale && normalizedFormatter === DateFormatConstants.WEEKDAY_LONG) {
    return formatChineseDatePreview(date, DateFormatConstants.CHINESE_WEEKDAY_LONG, runtimeLocale)
  }
  if (isChineseLocale && normalizedFormatter === DateFormatConstants.MONTH_LONG) {
    return `${date.getMonth() + 1}月`
  }

  const option = DateFormatOptions.find((o) => o.value === normalizedFormatter)
  const format = option ? option.format || option.label : 'YYYY-MM-DD'
  let formatted = moment(date).format(format)

  if (textCase === 1) {
    formatted = formatted.toUpperCase()
  } else if (textCase === 2) {
    formatted = formatted.toLowerCase()
  } else if (textCase === 0 || textCase === 3) {
    formatted = formatted.replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return formatted
}

function getDatePreviewLocale(designStore: ReturnType<typeof useDesignStore>): string {
  return resolveDesignEffectiveLocale(designStore)
}

export function createDate(config: DateElementConfig): FabricElement {
  const baseStore = useBaseStore()
  const propertiesStore = usePropertiesStore()
  const designStore = useDesignStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()
  const canvas = baseStore.canvas
  if (!canvas) {
    throw new Error('Canvas is not initialized, cannot add date element')
  }


  const elementId = config.id || nanoid()
  const resolvedDate = resolveDatePropertyConfig(config as any, propertiesStore.allProperties)
  const formatterValue = resolvedDate.formatter
  const formatterOption = DateFormatOptions.find((o) => o.value === formatterValue)
  if (!formatterOption) {
    throw new Error('Invalid date formatter')
  }

  const textCase = (propertiesStore as any).textCase as number | undefined
  const text = formatDate(getSimulatedNow(), formatterValue, textCase, getDatePreviewLocale(designStore))
  const previewFont = resolveCurrentElementPreviewFont(config, text)

  const element: any = new FabricText(text, {
    eleType: 'date',
    id: elementId,
    left: config.left,
    top: config.top,
    originX: config.originX as any,
    originY: config.originY as any,
    fontSize: Number(previewFont.fontSize),
    fill: config.fill,
    fontFamily: previewFont.fontFamily,
    dateProperty: resolvedDate.dateProperty,
    formatter: resolvedDate.formatter,
    formatterOptions: [...resolvedDate.formatterOptions],
    hasControls: false,
  } as any)
  applyCurrentElementPreviewFont(element, config, text)

  const updateTextCase = () => {
    try {
      const current = resolveDatePropertyConfig(element as any, propertiesStore.allProperties)
      const currentFormatter = current.formatter
      element.set({
        dateProperty: current.dateProperty,
        formatter: current.formatter,
        formatterOptions: [...current.formatterOptions],
      })
      const option2 = DateFormatOptions.find((o) => o.value === currentFormatter)
      const now = getSimulatedNow()
      const nextText = formatDate(
        now,
        option2 ? currentFormatter : (element as any).formatter,
        (propertiesStore as any).textCase,
        getDatePreviewLocale(designStore),
      )
      element.set('text', nextText)
      applyCurrentElementPreviewFont(element, {
        fontFamily: element.fontFamily,
        fontSize: element.fontSize,
        fill: element.fill,
      }, nextText)
      canvas.requestRenderAll?.()
    } catch (e) {
      console.warn('[date/updateTextCase] failed', e)
    }
  }

  
  canvas.add(element)
  layerStore.addLayer(element)
  elementManager.registerElementInstance(element as FabricElement)
  canvas.setActiveObject?.(element)

  ;(element as any).updateTextCase = updateTextCase

  const unwatch = propertiesStore.$subscribe(() => {
    setTimeout(() => updateTextCase(), 0)
  })

  ;(element as any).textCaseUnwatch = unwatch

  canvas.requestRenderAll?.()

  elementDataStore.upsertElement({
    id: String(elementId),
    eleType: 'date',
    left: element.left,
    top: element.top,
    originX: element.originX as any,
    originY: element.originY as any,
    fill: savedTextStyle(element).fill as any,
    ...getPersistedTextFont(config, element),
    dateProperty: (element as any).dateProperty,
    formatter: (element as any).formatter,
    formatterOptions: Array.isArray((element as any).formatterOptions)
      ? [...(element as any).formatterOptions]
      : undefined,
    topBase: encodeTopBaseForElement(element as any),
  } as any)


  return element as FabricElement
}

export function updateDate(element: FabricElement, patch: Partial<DateElementConfig> = {}, context: ElementUpdateContext = {}): void {
  const baseStore = useBaseStore()
  const propertiesStore = usePropertiesStore()
  const designStore = useDesignStore()
  const canvas = baseStore.canvas
  const elementDataStore = useElementDataStore()

  const obj: any = elementManager.getElementById((element as any).id) ?? element
  if (!obj) return

  const currentLeft = obj.left
  const currentTop = obj.top

  const updateProps: Record<string, any> = {
    left: patch.left,
    top: patch.top,
    fontSize: patch.fontSize,
    fill: patch.fill,
    fontFamily: patch.fontFamily,
    formatter: patch.formatter,
    formatterOptions: patch.formatterOptions,
    dateProperty: patch.dateProperty,
    originX: patch.originX,
    originY: patch.originY,
  }

  Object.keys(updateProps).forEach((key) => {
    if (updateProps[key] !== undefined) {
      obj.set(key, updateProps[key])
    }
  })

  if (patch.formatter !== undefined || patch.dateProperty !== undefined) {
    const resolved = resolveDatePropertyConfig(obj, propertiesStore.allProperties)
    obj.set({ formatter: resolved.formatter, formatterOptions: [...resolved.formatterOptions] })
    const nextFormatter = resolved.formatter
    const option = DateFormatOptions.find((o) => o.value === nextFormatter)
    if (option) {
      const textCase = (propertiesStore as any).textCase as number | undefined
      obj.set('text', formatDate(getSimulatedNow(), nextFormatter, textCase, getDatePreviewLocale(designStore)))
    }
  }

  if (patch.left === undefined) {
    obj.set('left', currentLeft)
  }
  if (patch.top === undefined) {
    obj.set('top', currentTop)
  }

  applyCurrentElementPreviewFont(obj, {
    fontFamily: obj.fontFamily, fontSize: obj.fontSize, fill: patch.fill,
  }, obj.text)

  obj.setCoords?.()
  canvas?.requestRenderAll?.()
  if (context.persist !== false && obj.id != null) {
    elementDataStore.patchElement(String(obj.id), {
      left: obj.left,
      top: obj.top,
      originX: obj.originX,
      originY: obj.originY,
      fill: savedTextStyle(obj).fill,
      fontSize: obj.fontSize,
      fontFamily: obj.fontFamily,
      dateProperty: obj.dateProperty,
      formatter: obj.formatter,
      formatterOptions: Array.isArray(obj.formatterOptions) ? [...obj.formatterOptions] : undefined,
      topBase: encodeTopBaseForElement(obj as any),
    } as any)
  }
}
