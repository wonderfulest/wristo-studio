/**
 * RGB 转 HEX
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => {
    const hex = n.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return '#' + toHex(r) + toHex(g) + toHex(b)
}

/**
 * HEX 转 RGB
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

export interface RgbColor {
  r: number
  g: number
  b: number
}

/**
 * 格式化颜色为 #000000 格式
 */
export const formatColorToHex = (color: RgbColor): string => {
  return rgbToHex(color.r, color.g, color.b)
}

/**
 * 比较两个颜色 (#000000 | {r,g,b} | 0x000000)
 */
export const compareColor = (color1: string | number | RgbColor, color2: string | number | RgbColor): boolean => {
  const rgb1 = toRgbObject(color1)
  const rgb2 = toRgbObject(color2)
  return rgb1.r === rgb2.r && rgb1.g === rgb2.g && rgb1.b === rgb2.b
}

function toRgbObject(color: string | number | RgbColor): RgbColor {
  if (typeof color === 'object' && color && 'r' in color && 'g' in color && 'b' in color) {
    return color as RgbColor
  }

  if (typeof color === 'number') {
    const hex = color === -1 ? '000000' : color.toString(16).padStart(6, '0')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return { r, g, b }
  }

  // string
  let s = color as string
  if (s.startsWith('0x')) s = s.substring(2)
  if (s.startsWith('#')) s = s.substring(1)
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]
  const r = parseInt(s.substring(0, 2), 16)
  const g = parseInt(s.substring(2, 4), 16)
  const b = parseInt(s.substring(4, 6), 16)
  return { r, g, b }
}

/**
 * 解码颜色
 */
export const decodeColor = (color: string | number): string => {
  if (typeof color === 'number') {
    if (color === -1) return 'transparent'
    const hex = color.toString(16).padStart(6, '0')
    return `#${hex}`
  }
  return color
}
