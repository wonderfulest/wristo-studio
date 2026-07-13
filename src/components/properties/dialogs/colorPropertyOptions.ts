import type { PropertyOption } from '@/types/properties'
import { normalizeRgb565Hex } from '@/utils/rgb565Color'

export const normalizeRgb565GarminColor = (value: unknown): string => `0x${normalizeRgb565Hex(value).slice(1).toLowerCase()}`

export const buildColorPropertyOptions = (defaultColor: unknown, standardColors: PropertyOption[]): PropertyOption[] => [
  { label: 'Default', value: normalizeRgb565GarminColor(defaultColor) },
  ...standardColors.map((option) => ({ ...option })),
  { label: 'Transparent', value: '-1' }
]
