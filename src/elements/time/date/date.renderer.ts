import moment from 'moment'
import { Text as FabricText } from 'fabric'
import { nanoid } from 'nanoid'
import { DateFormatOptions } from '@/config/settings'
import type { FabricElement } from '@/types/element'
import type { DateElementConfig } from '@/types/elements'
import { encodeTopBaseForElement } from '@/utils/baselineUtil'
import { useBaseStore } from '@/stores/baseStore'
import { usePropertiesStore } from '@/stores/properties'
import { useLayerStore } from '@/stores/layerStore'
import { useElementDataStore } from '@/stores/elementDataStore'
import * as elementManager from '@/engine/managers/elementManager'
import { getSimulatedNow } from '@/engine/simulator/simulatedClock'

function formatDate(date: Date, formatter: number, textCase: number | undefined): string {
  const option = DateFormatOptions.find((o) => o.value === formatter)
  const format = option ? option.label : 'YYYY-MM-DD'
  let formatted = moment(date).format(format)

  if (textCase === 1) {
    formatted = formatted.toUpperCase()
  } else if (textCase === 2) {
    formatted = formatted.toLowerCase()
  } else if (textCase === 3) {
    formatted = formatted.replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return formatted
}

export function createDate(config: DateElementConfig): FabricElement {
  const baseStore = useBaseStore()
  const propertiesStore = usePropertiesStore()
  const layerStore = useLayerStore()
  const elementDataStore = useElementDataStore()
  const canvas = baseStore.canvas
  if (!canvas) {
    throw new Error('Canvas is not initialized, cannot add date element')
  }


  const elementId = config.id || nanoid()
  const formatterValue = parseInt(String(config.formatter))
  const formatterOption = DateFormatOptions.find((o) => o.value === formatterValue)
  if (!formatterOption) {
    throw new Error('Invalid date formatter')
  }

  const textCase = (propertiesStore as any).textCase as number | undefined
  const text = formatDate(getSimulatedNow(), formatterValue, textCase)

  const element: any = new FabricText(text, {
    eleType: 'date',
    id: elementId,
    left: config.left,
    top: config.top,
    originX: config.originX as any,
    originY: config.originY as any,
    fontSize: Number(config.fontSize),
    fill: config.fill,
    fontFamily: config.fontFamily,
    formatter: config.formatter,
    hasControls: false,
  } as any)

  const updateTextCase = () => {
    try {
      const currentFormatter = parseInt(String((element as any).formatter))
      const option2 = DateFormatOptions.find((o) => o.value === currentFormatter)
      const now = getSimulatedNow()
      const nextText = formatDate(
        now,
        option2 ? currentFormatter : (element as any).formatter,
        (propertiesStore as any).textCase,
      )
      element.set('text', nextText)
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

  const unwatch = propertiesStore.$subscribe((mutation: any) => {
    if (
      mutation.type === 'direct' &&
      mutation.storeId === 'propertiesStore' &&
      mutation.payload &&
      'textCase' in mutation.payload
    ) {
      setTimeout(() => {
        updateTextCase()
      }, 0)
    }
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
    fill: element.fill as any,
    fontSize: element.fontSize as any,
    fontFamily: element.fontFamily as any,
    formatter: (element as any).formatter,
    topBase: encodeTopBaseForElement(element as any),
  } as any)


  return element as FabricElement
}

export function updateDate(element: FabricElement, patch: Partial<DateElementConfig> = {}): void {
  const baseStore = useBaseStore()
  const propertiesStore = usePropertiesStore()
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
    originX: patch.originX,
    originY: patch.originY,
  }

  Object.keys(updateProps).forEach((key) => {
    if (updateProps[key] !== undefined) {
      obj.set(key, updateProps[key])
    }
  })

  if (patch.formatter !== undefined) {
    const nextFormatter = parseInt(String(patch.formatter ?? obj.get('formatter')))
    const option = DateFormatOptions.find((o) => o.value === nextFormatter)
    if (option) {
      const textCase = (propertiesStore as any).textCase as number | undefined
      obj.set('text', formatDate(getSimulatedNow(), nextFormatter, textCase))
    }
  }

  if (patch.left === undefined) {
    obj.set('left', currentLeft)
  }
  if (patch.top === undefined) {
    obj.set('top', currentTop)
  }

  obj.setCoords?.()
  canvas?.requestRenderAll?.()
  if (obj.id != null) {
    elementDataStore.patchElement(String(obj.id), {
      left: obj.left,
      top: obj.top,
      originX: obj.originX,
      originY: obj.originY,
      fill: obj.fill,
      fontSize: obj.fontSize,
      fontFamily: obj.fontFamily,
      formatter: obj.formatter,
      topBase: encodeTopBaseForElement(obj as any),
    } as any)
  }
}
