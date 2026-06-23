import * as elementManager from '@/engine/managers/elementManager'
import { useCanvasStore } from '@/stores/canvasStore'
import { usePropertiesStore } from '@/stores/properties'
import { resolveDataTextTemplate } from '@/utils/dataSimulator'
import type { FabricElement } from '@/types/element'

const textElementTypes = new Set(['text', 'scrollableText', 'radialText', 'angledText'])

export async function syncTextPropertyValue(propertyKey: string, value: string) {
  const key = String(propertyKey || '').trim()
  if (!key) return

  const propertiesStore = usePropertiesStore()
  propertiesStore.setPropertyValue(key, value)

  const canvas = useCanvasStore().canvas as any
  const objects = (canvas?.getObjects?.() || []) as FabricElement[]
  const boundObjects = objects.filter((obj: any) => {
    return obj && obj.textProperty === key && textElementTypes.has(String(obj.eleType || ''))
  })

  for (const obj of boundObjects) {
    await elementManager.updateElement(obj, { textTemplate: value })
  }
}

export function resolveTextVariablePreview(value: string) {
  return resolveDataTextTemplate(value)
}
