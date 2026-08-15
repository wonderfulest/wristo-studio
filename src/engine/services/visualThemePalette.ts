export type ThemeTemperature = 'cool' | 'warm'

export interface CoordinatedThemeColors {
  colors: Record<string, string>
  temperature: ThemeTemperature
}

interface HslColor {
  hue: number
  saturation: number
  lightness: number
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const parseColor = (color: string): HslColor => {
  const normalized = /^(?:#|0x)[0-9a-f]{6}$/i.test(color.trim())
    ? color.trim().slice(-6)
    : 'FFFFFF'
  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const delta = maximum - minimum
  const lightness = (maximum + minimum) / 2
  if (delta === 0) return { hue: 0, saturation: 0, lightness }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  let hue = 0
  if (maximum === red) hue = 60 * (((green - blue) / delta) % 6)
  else if (maximum === green) hue = 60 * ((blue - red) / delta + 2)
  else hue = 60 * ((red - green) / delta + 4)
  return { hue: (hue + 360) % 360, saturation, lightness }
}

const hueToRgb = (p: number, q: number, rawHue: number) => {
  let hue = rawHue
  if (hue < 0) hue += 1
  if (hue > 1) hue -= 1
  if (hue < 1 / 6) return p + (q - p) * 6 * hue
  if (hue < 1 / 2) return q
  if (hue < 2 / 3) return p + (q - p) * (2 / 3 - hue) * 6
  return p
}

const toMonkeyColor = ({ hue, saturation, lightness }: HslColor) => {
  const h = ((hue % 360) + 360) % 360 / 360
  const s = clamp(saturation, 0, 1)
  const l = clamp(lightness, 0, 1)
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channels = s === 0
    ? [l, l, l]
    : [hueToRgb(p, q, h + 1 / 3), hueToRgb(p, q, h), hueToRgb(p, q, h - 1 / 3)]
  return `0x${channels
    .map((channel) => Math.round(channel * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`
}

const roleLightness = (lightness: number, random: () => number) => {
  if (lightness <= 0.12) return 0.1 + random() * 0.06
  if (lightness < 0.35) return 0.18 + random() * 0.1
  if (lightness > 0.88) return 0.88 + random() * 0.06
  if (lightness > 0.65) return 0.72 + random() * 0.12
  return 0.4 + random() * 0.18
}

/** Builds one dominant temperature family plus a restrained opposite-temperature accent. */
export function generateCoordinatedThemeColors(
  source: Record<string, string>,
  random: () => number = Math.random,
): CoordinatedThemeColors {
  const entries = Object.entries(source)
  const temperature: ThemeTemperature = random() < 0.5 ? 'cool' : 'warm'
  if (!entries.length) return { colors: {}, temperature }

  const parsed = entries.map(([key, color]) => ({ key, color: parseColor(color) }))
  const strongestSaturation = Math.max(...parsed.map(({ color }) => color.saturation))
  const accentKey = strongestSaturation >= 0.35
    ? parsed.find(({ color }) => color.saturation === strongestSaturation)?.key
    : undefined
  const baseHue = temperature === 'cool'
    ? 195 + random() * 65
    : 8 + random() * 47
  const accentHue = temperature === 'cool'
    ? 15 + random() * 35
    : 190 + random() * 65
  const analogousOffsets = [-18, 0, 16, -9, 9]

  const colors = Object.fromEntries(parsed.map(({ key, color }, index) => {
    const isAccent = key === accentKey
    const saturation = isAccent
      ? 0.68 + random() * 0.18
      : color.saturation < 0.08
        ? 0.12 + random() * 0.12
        : 0.42 + random() * 0.2
    return [key, toMonkeyColor({
      hue: isAccent ? accentHue : baseHue + analogousOffsets[index % analogousOffsets.length],
      saturation,
      lightness: roleLightness(color.lightness, random),
    })]
  }))

  return { colors, temperature }
}
