import type { PropertyOption } from '@/types/properties'
import { normalizeRgb565Hex } from '@/utils/rgb565Color'

export const normalizeRgb565GarminColor = (value: unknown): string => `0x${normalizeRgb565Hex(value).slice(1).toLowerCase()}`

export const buildColorPropertyOptions = (defaultColor: unknown, standardColors: PropertyOption[]): PropertyOption[] => {
  const defaultValue = normalizeRgb565GarminColor(defaultColor)

  return [
    { label: 'Default', value: defaultValue },
    ...standardColors.filter((option) => normalizeRgb565GarminColor(option.value) !== defaultValue).map((option) => ({ ...option })),
    { label: 'Transparent', value: '-1' }
  ]
}
