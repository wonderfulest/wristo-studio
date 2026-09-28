import { usesGoalProgress } from './dynamicImage.goal'
import type { DynamicImageElementConfig } from '@/types/elements/dynamicImage'
import { validateVisibilityExpression } from '@/engine/expression/validation'

export function validateDynamicImage(config: DynamicImageElementConfig, properties?: Record<string, any>): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  if (config.selectionMode && !['expression', 'goalProgress'].includes(config.selectionMode)) errors.push('Unsupported dynamic image selection mode')
  if (usesGoalProgress(config)) {
    if (!/^goal_[1-9][0-9]*$/.test(config.goalProperty || '')) errors.push('Invalid goal property')
    if (properties) {
      const property = properties[config.goalProperty || '']
      if (property?.type !== 'goal') errors.push('Goal image binding must reference a goal property')
      else if (!property.options?.length || !property.options.some((option: any) => option.value === property.value)) errors.push('Goal image property requires a valid selected option')
    }
    const property = properties?.[config.goalProperty || '']
    if (property?.options) {
      const values = property.options.map((option: any) => option.value)
      if (values.some((value: any) => !Number.isInteger(value)) || new Set(values).size !== values.length) errors.push('Goal image options require unique integer catalog codes')
      if (property.options.some((option: any) => !option.metricSymbol || (option.valueCode !== undefined && option.valueCode !== option.value))) errors.push('Goal image options must match their catalog codes')
    }
    const thresholds = config.items?.map(item => item.minProgress) ?? []
    if (!thresholds.includes(0)) errors.push('Goal images require a stage starting at zero')
    if (thresholds.some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)) errors.push('Goal image thresholds must be in 0..1')
    if (new Set(thresholds).size !== thresholds.length) errors.push('Duplicate goal image thresholds')
  }
  if (!config.items?.length) errors.push('Dynamic image requires at least one candidate')
  config.items?.forEach((item, index) => {
    const label = `Dynamic image candidate ${index + 1}`
    if (!item.imageUrl?.trim()) errors.push(`${label} is missing an asset`)
    if (!item.id?.trim()) errors.push(`${label} is missing an id`)
    else if (ids.has(item.id)) errors.push(`${label} has a duplicate id: ${item.id}`)
    else ids.add(item.id)
    if (!usesGoalProgress(config)) errors.push(...validateVisibilityExpression({ mode: 'expression', expression: item.expression, fallback: false }).map((message) => `${label}: ${message}`))
  })
  return errors
}
