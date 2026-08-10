import type { SubDialProgressMode } from '@/types/elements/subDial'

type BindingConfig = { dialProperty: string; progressMode: SubDialProgressMode }
type DialOption = { value?: unknown; dialMode?: unknown; dialMin?: unknown; dialMax?: unknown; dialGoalSource?: unknown }
type DialProperty = { type?: unknown; dialMode?: unknown; value?: unknown; options?: DialOption[] }

export function resolveSubDialBindingIssue(config: BindingConfig, property: DialProperty | undefined): string | null {
  if (!config.dialProperty) return null
  if (!property || property.type !== 'dial') return 'Selected Dial Property is missing'
  if (property.dialMode !== config.progressMode) return 'Dial Property mode does not match this Sub-dial'
  const selected = property.options?.find(option => option.value === property.value)
  if (!selected) return 'Selected Dial data type is missing'
  if (selected.dialMode !== config.progressMode) return 'Selected Dial data type mode is invalid'
  if (config.progressMode === 'goal') {
    return selected.dialGoalSource === 'garmin' ? null : 'Selected Dial goal source is unsupported'
  }
  const minimum = Number(selected.dialMin)
  const maximum = Number(selected.dialMax)
  return Number.isFinite(minimum) && Number.isFinite(maximum) && maximum > minimum
    ? null
    : 'Selected Dial data range is invalid'
}
