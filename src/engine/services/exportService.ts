import { ElMessage } from 'element-plus'
import type { Canvas } from 'fabric'
import type { PropertiesMap } from '@/types/properties'
import type { RuntimeDesignConfig } from '@/types/app/config'
import type { AnyElementConfig } from '@/types/elements'
import { encodeElementByRegistry } from '@/engine/registry/elementRegistry'
import type { FabricElement } from '@/types/element'

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

export interface GenerateConfigOptions {
  canvas: Canvas | null
  properties: PropertiesMap
  designId: string
  watchFaceName: string
  textCase: number
  labelLengthType: number
  showUnit: boolean
}

export function generateConfig(options: GenerateConfigOptions): RuntimeDesignConfig | null {
  const {
    canvas,
    properties,
    designId,
    watchFaceName,
    textCase,
    labelLengthType,
    showUnit,
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
    labelLengthType,
    showUnit,
    elements: [],
    orderIds: [],
  }

  const objects: FabricElement[] = canvas.getObjects() as FabricElement[]
  let imageId = 0,
    timeId = 0,
    dateId = 0,
    subItemId = 0

  // 背景元素：始终放在 elements[0]
  const bgObj = objects.find((o) => (o as any)?.eleType === 'background')
  if (bgObj) {
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
    return config
  } catch (err) {
    console.error('Generate config failed:', err)
    const message = (err as Error)?.message || 'Failed to generate configuration'
    ElMessage.error(message)
    return null
  }
}
