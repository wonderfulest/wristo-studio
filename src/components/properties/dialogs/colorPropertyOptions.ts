import type { PropertyOption } from '@/types/properties'

const WHITE = 'ffffff'

const parseRgbHex = (value: unknown): string => {
  const raw = String(value ?? '').trim()
  const match = raw.match(/^(?:#|0x)?([0-9a-fA-F]{6})$/)
  return match?.[1].toLowerCase() ?? WHITE
}

const expand5 = (value: number) => (value << 3) | (value >> 2)
const expand6 = (value: number) => (value << 2) | (value >> 4)

export const normalizeRgb565GarminColor = (value: unknown): string => {
  const hex = parseRgbHex(value)
  const red = expand5(Math.round((parseInt(hex.slice(0, 2), 16) * 31) / 255))
  const green = expand6(Math.round((parseInt(hex.slice(2, 4), 16) * 63) / 255))
  const blue = expand5(Math.round((parseInt(hex.slice(4, 6), 16) * 31) / 255))

  return `0x${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

export const buildColorPropertyOptions = (defaultColor: unknown, standardColors: PropertyOption[]): PropertyOption[] => [
  { label: 'Default', value: normalizeRgb565GarminColor(defaultColor) },
  ...standardColors.map((option) => ({ ...option })),
  { label: 'Transparent', value: '-1' }
]
