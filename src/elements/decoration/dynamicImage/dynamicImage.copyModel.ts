import type { DynamicImageItem } from '@/types/elements/dynamicImage'
import { toRaw } from 'vue'

export interface CopyableDynamicImageGroup {
  id: string
  label: string
  items: DynamicImageItem[]
}

const parseDesignConfig = (config: unknown): Record<string, unknown> | null => {
  if (typeof config === 'string') {
    try {
      const parsed = JSON.parse(config)
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
      return null
    }
  }
  return config && typeof config === 'object' ? config as Record<string, unknown> : null
}

export const extractDynamicImageGroups = (config: unknown): CopyableDynamicImageGroup[] => {
  const parsed = parseDesignConfig(config)
  const elements = Array.isArray(parsed?.elements) ? parsed.elements : []
  let dynamicGroupIndex = 0

  return elements.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return []
    const element = candidate as Record<string, unknown>
    if (element.eleType !== 'dynamicImage') return []
    if (!Array.isArray(element.items) || element.items.length === 0) return []
    dynamicGroupIndex += 1

    const layerName = typeof element.layerName === 'string' ? element.layerName.trim() : ''
    return [{
      id: String(element.id || `dynamic-image-${dynamicGroupIndex}`),
      label: layerName || `Dynamic image group ${dynamicGroupIndex}`,
      items: element.items as DynamicImageItem[],
    }]
  })
}

export const appendCopiedDynamicImageItems = (
  currentItems: DynamicImageItem[],
  sourceItems: DynamicImageItem[],
  createId: () => string,
): DynamicImageItem[] => [
  ...currentItems,
  ...sourceItems.map(item => ({
    ...structuredClone(toRaw(item)),
    id: createId(),
  })),
]
