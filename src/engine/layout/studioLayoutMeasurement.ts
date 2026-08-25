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
    height: Math.max(0, bounds.height),
    participates,
    placeAtVisualCenter(centerX: number, centerY: number) {
      const current = readBounds(anyElement)
      const dx = centerX - (current.left + current.width / 2)
      const dy = centerY - (current.top + current.height / 2)
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
