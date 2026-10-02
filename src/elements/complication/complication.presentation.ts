import icons from './complication.icons.json'
import type { ComplicationElementConfig } from '@/types/elements/complication'

export const COMPLICATION_MODES = ['shortcut', 'icon', 'value', 'iconValue', 'progress', 'label'] as const
export const COMPLICATION_ICON_OPTIONS = Object.keys(icons.icons).map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))
export const COMPLICATION_PRESENTATION_DEFAULTS = {
  displayWidth: 160,
  displayHeight: 64,
  iconSource: 'auto',
  customIcon: 'heart',
  iconSize: 30,
  iconGap: 8,
  backgroundShape: 'none',
  backgroundColor: '#202020',
  progressRange: 'source',
  progressMin: 0,
  progressMax: 100,
  progressThickness: 6,
  progressTrackColor: '#333333',
  touchMode: 'auto',
  touchShape: 'rectangle',
  touchPadding: 8,
  touchOffsetX: 0,
  touchOffsetY: 0
} as const

export const COMPLICATION_FIELDS = [
  ...Object.keys(COMPLICATION_PRESENTATION_DEFAULTS),
  'complicationType',
  'complicationProperty',
  'displayMode',
  'touchWidth',
  'touchHeight',
  'launchOnPress'
] as const

type Config = Partial<ComplicationElementConfig>
export function normalizeComplicationPresentation(config: Config) {
  return {
    ...COMPLICATION_PRESENTATION_DEFAULTS,
    ...config,
    displayMode: config.displayMode ?? 'value',
    fontFamily: config.fontFamily ?? 'roboto-condensed-regular',
    fontSize: config.fontSize ?? 36,
    launchOnPress: config.launchOnPress ?? true,
    // Existing files used independent rectangles; do not silently enlarge those regions.
    touchMode: config.touchMode ?? 'custom',
    displayWidth: config.displayWidth ?? (config.displayMode === 'shortcut' ? (config.touchWidth ?? 96) : 160),
    displayHeight: config.displayHeight ?? (config.displayMode === 'shortcut' ? (config.touchHeight ?? 64) : 64),
    touchWidth: config.touchWidth ?? 96,
    touchHeight: config.touchHeight ?? 64
  }
}
export function complicationIcon(config: Config, source: number): keyof typeof icons.icons {
  return ((config.iconSource === 'custom' ? config.customIcon : icons.sourceIcons[String(source) as keyof typeof icons.sourceIcons]) as keyof typeof icons.icons) || 'heart'
}
export function complicationTouchBounds(config: Config) {
  const item = normalizeComplicationPresentation(config)
  const width = item.touchMode === 'auto' ? item.displayWidth + item.touchPadding * 2 : item.touchWidth
  const height = item.touchMode === 'auto' ? item.displayHeight + item.touchPadding * 2 : item.touchHeight
  const diameter = Math.min(width, height)
  const w = item.touchShape === 'circle' ? diameter : width
  const h = item.touchShape === 'circle' ? diameter : height
  return { x: -w / 2 + item.touchOffsetX, y: -h / 2 + item.touchOffsetY, width: w, height: h, shape: item.touchShape }
}
export function complicationHitTest(config: Config, x: number, y: number): boolean {
  const bounds = complicationTouchBounds(config)
  if (bounds.shape === 'circle') {
    const r = bounds.width / 2
    return (x - bounds.x - r) ** 2 + (y - bounds.y - r) ** 2 <= r ** 2
  }
  return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height
}
const sampleValues: Record<number, number> = {
  1: 83,
  2: 9088,
  3: 2163,
  4: 8,
  5: 120,
  13: 22320,
  14: 65520,
  15: 125,
  16: 101300,
  17: 3,
  18: 72,
  19: 21500,
  20: 48200,
  21: 480,
  22: 25,
  23: 78,
  24: 52,
  25: 55,
  27: 1350,
  28: 2775,
  29: 6120,
  30: 12900,
  31: 3.7,
  32: 3.6,
  33: 3.45,
  34: 3.27,
  35: 98,
  36: 16,
  37: 65,
  38: 24,
  40: 900,
  42: 85
}
const sampleRanges: Record<number, [number, number]> = {
  1: [0, 100],
  2: [0, 10000],
  3: [0, 2500],
  4: [0, 10],
  5: [0, 150],
  22: [0, 100],
  23: [0, 100],
  35: [0, 100],
  37: [0, 100],
  40: [0, 1000],
  42: [0, 100]
}
export function complicationProgress(config: Config, source: number): number | null {
  const value = sampleValues[source]
  const range = config.progressRange === 'custom' ? [config.progressMin ?? 0, config.progressMax ?? 100] : sampleRanges[source]
  if (!Number.isFinite(value) || !range || range[1] <= range[0]) return null
  return Math.max(0, Math.min(1, (value - range[0]) / (range[1] - range[0])))
}
export function drawComplicationIcon(ctx: CanvasRenderingContext2D, key: keyof typeof icons.icons, x: number, y: number, size: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 24, size / 24)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 1.8
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (const shape of icons.icons[key] ?? icons.icons.heart) {
    ctx.beginPath()
    if (shape.points) {
      shape.points.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)))
      if (shape.kind === 'polygon') {
        ctx.closePath()
        ctx.fill()
      } else ctx.stroke()
    } else {
      ctx.arc(shape.x!, shape.y!, shape.r!, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  ctx.restore()
}
