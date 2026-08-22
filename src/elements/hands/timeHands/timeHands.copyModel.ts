import type { AnyElementConfig } from '@/types/elements'
import { toRaw } from 'vue'

export type RequiredTimeHandType = 'hourHand' | 'minuteHand' | 'secondHand'
export type TimeHandsElementType = RequiredTimeHandType | 'centerCap'
export type CopyableTimeHandsElement = AnyElementConfig & {
  eleType: TimeHandsElementType
  imageUrl?: string | null
}

const REQUIRED_TYPES: RequiredTimeHandType[] = ['hourHand', 'minuteHand', 'secondHand']
const TIME_HAND_TYPES = new Set<TimeHandsElementType>([...REQUIRED_TYPES, 'centerCap'])

export interface CopyableTimeHandsGroup {
  elements: CopyableTimeHandsElement[]
  missingRequiredTypes: RequiredTimeHandType[]
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

export const extractTimeHandsGroup = (config: unknown): CopyableTimeHandsGroup => {
  const parsed = parseDesignConfig(config)
  const candidates = Array.isArray(parsed?.elements) ? parsed.elements : []
  const orderIds = Array.isArray(parsed?.orderIds)
    ? parsed.orderIds.map(id => String(id))
    : []
  const orderById = new Map(orderIds.map((id, index) => [id, index]))

  const ordered = candidates
    .map((candidate, sourceIndex) => ({ candidate, sourceIndex }))
    .sort((left, right) => {
      const leftId = left.candidate && typeof left.candidate === 'object'
        ? String((left.candidate as Record<string, unknown>).id ?? '')
        : ''
      const rightId = right.candidate && typeof right.candidate === 'object'
        ? String((right.candidate as Record<string, unknown>).id ?? '')
        : ''
      const leftOrder = orderById.get(leftId) ?? orderIds.length + left.sourceIndex
      const rightOrder = orderById.get(rightId) ?? orderIds.length + right.sourceIndex
      return leftOrder - rightOrder
    })

  const seenTypes = new Set<TimeHandsElementType>()
  const elements = ordered.flatMap(({ candidate }) => {
    if (!candidate || typeof candidate !== 'object') return []
    const element = candidate as CopyableTimeHandsElement
    const eleType = String(element.eleType) as TimeHandsElementType
    if (!TIME_HAND_TYPES.has(eleType) || seenTypes.has(eleType)) return []
    seenTypes.add(eleType)
    return [element]
  })

  return {
    elements,
    missingRequiredTypes: REQUIRED_TYPES.filter(type => !seenTypes.has(type)),
  }
}

export const prepareCopiedTimeHandsConfigs = (
  source: AnyElementConfig[],
  createId: () => string,
): AnyElementConfig[] => source.map(element => ({
  ...structuredClone(toRaw(element)),
  id: createId(),
}))
