import { DataTypeOptions } from '@/config/settings'
import * as elementManager from '@/engine/managers/elementManager'
import { useCanvasStore } from '@/stores/canvasStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import { useHistoryStore } from '@/stores/historyStore'
import { usePropertiesStore } from '@/stores/properties'
import { useDesignStore } from '@/stores/designStore'
import type { PropertyType } from '@/types/properties'
import type { DataTypeOption } from '@/types/settings'
import { resolveMetricLabel, resolveMetricUnit } from '@/utils/metricLabel'
import { resolveIconGlyphText } from '@/utils/iconGlyph'
import { normalizeIconUnicode } from '@/types/amoledIcons'

type BindableMetricPropertyType = Extract<PropertyType, 'data' | 'goal'>

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const metricOptionsByType = (type: BindableMetricPropertyType): DataTypeOption[] => {
  const prefix = type === 'goal' ? ':GOAL_TYPE_' : ':FIELD_TYPE_'
  return DataTypeOptions.filter((option) => option.metricSymbol.startsWith(prefix))
}

const getNextPropertyIndex = (type: BindableMetricPropertyType): number => {
  const propertiesStore = usePropertiesStore()
  const prefix = `${type}_`
  let max = 0
  Object.keys(propertiesStore.allProperties).forEach((key) => {
    const match = key.match(new RegExp(`^${prefix}(\\d+)$`))
    if (match) max = Math.max(max, Number(match[1]))
  })
  return max + 1
}

export const getNextMetricPropertyDefaults = (type: BindableMetricPropertyType) => {
  const index = getNextPropertyIndex(type)
  const titlePrefix = type === 'goal' ? 'Goal' : 'Data'
  return {
    index,
    key: `${type}_${index}`,
    title: `${titlePrefix} ${index}`,
  }
}

export const createQuickMetricProperty = (type: BindableMetricPropertyType): string => {
  const propertiesStore = usePropertiesStore()
  const options = metricOptionsByType(type)
  const defaults = getNextMetricPropertyDefaults(type)
  const fallback = options[0] ?? DataTypeOptions[0]

  propertiesStore.addProperty({
    key: defaults.key,
    type,
    title: defaults.title,
    options: clone(options),
    defaultValue: fallback?.value ?? '',
  })

  useHistoryStore().saveState(`properties:quick-add-${type}`)
  return defaults.key
}

const getUsedMetricPropertyKeys = (type: BindableMetricPropertyType): Set<string> => {
  const keyName = type === 'goal' ? 'goalProperty' : 'dataProperty'
  const used = new Set<string>()
  const elementDataStore = useElementDataStore()

  elementDataStore.elements.forEach((snapshot) => {
    const value = (snapshot.config as any)?.[keyName]
    if (value) used.add(String(value))
  })

  const canvasStore = useCanvasStore()
  ;(canvasStore.canvas?.getObjects?.() ?? []).forEach((element: any) => {
    const value = element?.[keyName]
    if (value) used.add(String(value))
  })

  return used
}

export const getUnusedMetricPropertyKey = (type: BindableMetricPropertyType): string => {
  const propertiesStore = usePropertiesStore()
  const usedKeys = getUsedMetricPropertyKeys(type)
  const entry = Object.entries(propertiesStore.allProperties).find(
    ([key, prop]) => prop.type === type && !usedKeys.has(key),
  )
  return entry?.[0] ?? ''
}

export const getOrCreateAvailableMetricProperty = (
  type: BindableMetricPropertyType,
): { key: string; created: boolean } => {
  const unusedKey = getUnusedMetricPropertyKey(type)
  if (unusedKey) return { key: unusedKey, created: false }
  return { key: createQuickMetricProperty(type), created: true }
}

const getActiveElements = (): any[] => {
  const canvasStore = useCanvasStore()
  const canvasObjects = canvasStore.canvas?.getObjects?.() ?? []
  const idSet = new Set(canvasStore.activeIds.map(String))
  const byActiveIds = canvasObjects.filter((obj: any) => obj?.id != null && idSet.has(String(obj.id)))
  if (byActiveIds.length > 0) return byActiveIds
  return canvasStore.canvas?.getActiveObjects?.() ?? []
}

const getPatchForElement = (element: any, propertyKey: string, type: BindableMetricPropertyType) => {
  const propertiesStore = usePropertiesStore()
  const designStore = useDesignStore()
  const metric = propertiesStore.getMetricByOptions(
    type === 'goal'
      ? { goalProperty: propertyKey }
      : { dataProperty: propertyKey }
  )
  const eleType = String(element?.eleType ?? '')

  if (type === 'data') {
    if (!['data', 'icon', 'label', 'unit'].includes(eleType)) return null
    if (eleType === 'icon') {
      const iconUnicode = normalizeIconUnicode((metric as any).iconUnicode || metric.icon)
      return {
        dataProperty: propertyKey,
        goalProperty: null,
        metricSymbol: metric.metricSymbol,
        text: resolveIconGlyphText(iconUnicode),
        iconDisplayType: 'mip',
        amoledImageUrl: null,
        amoledIconUnicode: iconUnicode || null
      }
    }
    if (eleType === 'label') return { dataProperty: propertyKey, goalProperty: null, text: resolveMetricLabel(metric, designStore.supportsChineseContent ? 'zh' : 'en') }
    if (eleType === 'unit') {
      const unitText = resolveMetricUnit(metric, designStore.supportsChineseContent ? 'zh' : 'en')
      return { dataProperty: propertyKey, goalProperty: null, text: unitText, metricValue: unitText }
    }
    return { dataProperty: propertyKey, goalProperty: null, text: metric.defaultValue }
  }

  if (['goalBar', 'goalArc'].includes(eleType)) {
    return { goalProperty: propertyKey }
  }
  if (eleType === 'icon') {
    const iconUnicode = normalizeIconUnicode((metric as any).iconUnicode || metric.icon)
    return {
      goalProperty: propertyKey,
      dataProperty: null,
      metricSymbol: metric.metricSymbol,
      text: resolveIconGlyphText(iconUnicode),
      iconDisplayType: 'mip',
      amoledImageUrl: null,
      amoledIconUnicode: iconUnicode || null
    }
  }
  if (eleType === 'label') return { goalProperty: propertyKey, dataProperty: null, text: resolveMetricLabel(metric, designStore.supportsChineseContent ? 'zh' : 'en') }
  if (eleType === 'data') return { goalProperty: propertyKey, dataProperty: null, text: metric.defaultValue }
  if (eleType === 'unit') {
    const unitText = resolveMetricUnit(metric, designStore.supportsChineseContent ? 'zh' : 'en')
    return { goalProperty: propertyKey, dataProperty: null, text: unitText, metricValue: unitText }
  }

  return null
}

export const canBindMetricPropertyToSelection = (type: PropertyType): boolean => {
  if (type !== 'data' && type !== 'goal') return false
  return getActiveElements().some((element) => getPatchForElement(element, '', type))
}

export const bindMetricPropertyToSelection = async (
  propertyKey: string,
  type: PropertyType,
): Promise<number> => {
  if (type !== 'data' && type !== 'goal') return 0

  const historyStore = useHistoryStore()
  let boundCount = 0
  for (const element of getActiveElements()) {
    const id = element?.id
    if (id == null) continue
    const patch = getPatchForElement(element, propertyKey, type)
    if (!patch) continue
    await elementManager.updateElementById(String(id), patch)
    boundCount += 1
  }

  if (boundCount > 0) {
    useCanvasStore().canvas?.requestRenderAll?.()
    historyStore.saveState(`settings:bind-${type}-property`)
  }

  return boundCount
}
