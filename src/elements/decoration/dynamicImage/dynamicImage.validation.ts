import type { DynamicImageElementConfig } from '@/types/elements/dynamicImage'
import { validateVisibilityExpression } from '@/engine/expression/validation'

export function validateDynamicImage(config: DynamicImageElementConfig): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  if (!config.items?.length) errors.push('Dynamic image requires at least one candidate')
  config.items?.forEach((item, index) => {
    const label = `Dynamic image candidate ${index + 1}`
    if (!item.imageUrl?.trim()) errors.push(`${label} is missing an asset`)
    if (!item.id?.trim()) errors.push(`${label} is missing an id`)
    else if (ids.has(item.id)) errors.push(`${label} has a duplicate id: ${item.id}`)
    else ids.add(item.id)
    errors.push(...validateVisibilityExpression({ mode: 'expression', expression: item.expression, fallback: false }).map((message) => `${label}: ${message}`))
  })
  return errors
}
