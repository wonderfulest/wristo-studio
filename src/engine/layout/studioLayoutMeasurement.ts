import type { FabricElement } from '@/types/element'
import type { DisplayStateMode } from '@/utils/displayStates'
import { getDisplayState } from '@/utils/displayStates'
import { isHorizontalLayoutElementType } from '@/types/layoutGroup'

export interface StudioLayoutMeasurement {
  width: number
  height: number
  participates: boolean
  placeAtVisualCenter: (centerX: number, centerY: number) => void
}

const TEXT_CONTENT_TYPES = new Set(['data', 'unit', 'label', 'text', 'time', 'date'])

// Fabric's line box includes unequal ascender/descender padding. Measure the
// rendered ink (including bitmap previews), without changing horizontal advance.
function textInkVerticalBounds(element: any): { offset: number; height: number } | null {
  if (!['data', 'label', 'unit'].includes(String(element.eleType)) || typeof element.toCanvasElement !== 'function') return null
  const raster = element.toCanvasElement({ withoutShadow: true, enableRetinaScaling: false, multiplier: 2 })
  const context = raster.getContext('2d')
  if (!context || !raster.width || !raster.height) return null
  const pixels = context.getImageData(0, 0, raster.width, raster.height).data
  let first = raster.height
  let last = -1
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      if (pixels[(y * raster.width + x) * 4 + 3] > 0) {
        first = Math.min(first, y)
        last = y
        break
      }
    }
  }
  return last < first ? null : { offset: (first + last + 1 - raster.height) / 4, height: (last - first + 1) / 2 }
}

const finite = (value: unknown, fallback = 0): number => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const readBounds = (element: any) => {
  const bounds = typeof element?.getBoundingRect === 'function'
    ? element.getBoundingRect()
    : null
  const width = finite(bounds?.width, finite(element?.width) * finite(element?.scaleX, 1))
  const height = finite(bounds?.height, finite(element?.height) * finite(element?.scaleY, 1))
  const left = finite(bounds?.left, finite(element?.left) - width / 2)
  const top = finite(bounds?.top, finite(element?.top) - height / 2)
  return { left, top, width, height }
}

const hasDrawableContent = (element: any, eleType: string): boolean => {
  if (!TEXT_CONTENT_TYPES.has(eleType)) return true
  const content = element?.text ?? element?.metricValue ?? ''
  return String(content).length > 0
}

export function measureStudioLayoutMember(
  element: FabricElement,
  mode: DisplayStateMode,
): StudioLayoutMeasurement {
  const anyElement = element as any
  const eleType = String(anyElement?.eleType ?? '')
  const bounds = readBounds(anyElement)
  const ink = textInkVerticalBounds(anyElement)
  const displayVisible = anyElement?.displayStates == null
    ? true
    : getDisplayState(anyElement.displayStates, mode)
  const participates = isHorizontalLayoutElementType(eleType)
    && anyElement.visible !== false
    && displayVisible
    && hasDrawableContent(anyElement, eleType)
    && Number.isFinite(bounds.width)
    && bounds.width > 0

  return {
    width: bounds.width,
    height: Math.max(0, ink?.height ?? bounds.height),
    participates,
    placeAtVisualCenter(centerX: number, centerY: number) {
      const current = readBounds(anyElement)
      const dx = centerX - (current.left + current.width / 2)
      const dy = centerY - (current.top + current.height / 2 + (ink?.offset ?? 0))
      const next: Record<string, number> = {
        left: finite(anyElement.left) + dx,
        top: finite(anyElement.top) + dy,
      }
      if (Number.isFinite(Number(anyElement.topBase))) {
        next.topBase = Number(anyElement.topBase) + dy
      }
      anyElement.set?.(next)
      if (typeof anyElement.set !== 'function') Object.assign(anyElement, next)
      anyElement.setCoords?.()
    },
  }
}
