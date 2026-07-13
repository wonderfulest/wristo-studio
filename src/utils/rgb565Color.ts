export interface RgbColor {
  r: number
  g: number
  b: number
}

export interface HsvColor {
  h: number
  s: number
  v: number
}

export const clampUnit = (value: number) => Math.min(1, Math.max(0, value))

export const parseHexColor = (value: unknown): RgbColor | null => {
  const match = String(value ?? '').trim().match(/^(?:#|0x)?([0-9a-f]{6})$/i)
  if (!match) return null
  return {
    r: parseInt(match[1].slice(0, 2), 16),
    g: parseInt(match[1].slice(2, 4), 16),
    b: parseInt(match[1].slice(4, 6), 16),
  }
}

const expand5 = (value: number) => (value << 3) | (value >> 2)
const expand6 = (value: number) => (value << 2) | (value >> 4)

export const rgbToHex = ({ r, g, b }: RgbColor): string =>
  `#${[r, g, b].map((channel) => Math.min(255, Math.max(0, Math.round(channel))).toString(16).padStart(2, '0')).join('').toUpperCase()}`

export const normalizeRgb565Hex = (value: unknown): string => {
  const rgb = parseHexColor(value) ?? { r: 255, g: 255, b: 255 }
  return rgbToHex({
    r: expand5(Math.round((rgb.r * 31) / 255)),
    g: expand6(Math.round((rgb.g * 63) / 255)),
    b: expand5(Math.round((rgb.b * 31) / 255)),
  })
}

export const rgbToHsv = ({ r, g, b }: RgbColor): HsvColor => {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  let h = 0
  if (delta !== 0) {
    if (max === red) h = 60 * (((green - blue) / delta) % 6)
    else if (max === green) h = 60 * ((blue - red) / delta + 2)
    else h = 60 * ((red - green) / delta + 4)
  }
  if (h < 0) h += 360
  return { h, s: max === 0 ? 0 : delta / max, v: max }
}

export const hsvToRgb = ({ h, s, v }: HsvColor): RgbColor => {
  const hue = ((h % 360) + 360) % 360
  const saturation = clampUnit(s)
  const value = clampUnit(v)
  const chroma = value * saturation
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = value - chroma
  const sectors = [
    [chroma, x, 0], [x, chroma, 0], [0, chroma, x],
    [0, x, chroma], [x, 0, chroma], [chroma, 0, x],
  ]
  const [red, green, blue] = sectors[Math.min(5, Math.floor(hue / 60))]
  return {
    r: Math.round((red + m) * 255),
    g: Math.round((green + m) * 255),
    b: Math.round((blue + m) * 255),
  }
}
