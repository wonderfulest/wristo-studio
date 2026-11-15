import type { DataTypeOption } from '@/types/dataCatalog'
import { normalizeIconUnicode } from '@/types/amoledIcons'
import type { WatchfaceIcon } from './watchfaceIcons'

export function normalizeIconName(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\.(png|svg)$/i, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

// Synonyms only: never guess by partial matches (e.g. temperature vs temperature high).
const aliases = [
  ['active-minutes', 'dayly-active-minutes', 'daily-active-minutes', 'intensity-minutes', '活动分钟', '活跃分钟'],
  ['blood-oxygen', 'pulse-ox', 'spo2', 'oxygen-saturation', '血氧'],
  ['breathing', 'respiration-rate', 'respiration', '呼吸', '呼吸频率'],
  ['floors', 'floors-climbed', '楼层', '爬楼层数'],
  ['hydration', 'water-intake', 'water', '饮水', '饮水量'],
  ['sleep', 'sleep-score', '睡眠', '睡眠评分'],
  ['heart', 'heart-rate', '心率'],
  ['battery', 'battery-level', '电池', '电池电量']
].map((group) => group.map(normalizeIconName))

export function matchIconFilename(filename: string, icons: readonly WatchfaceIcon[], options: readonly DataTypeOption[]): WatchfaceIcon[] {
  const name = normalizeIconName(filename)
  if (!name) return []
  const names = new Set(aliases.find((group) => group.includes(name)) || [name])
  const unicodes = new Set(
    options
      .filter((option) => {
        const labels = [
          option.metricSymbol.replace(/^:?(FIELD|GOAL|CHART|INDICATOR|DATA)_TYPE_/i, ''),
          option.settingsLabel.eng,
          option.settingsLabel.zhs,
          option.label?.eng?.short,
          option.label?.eng?.medium,
          option.label?.eng?.long,
          option.label?.zhs
        ]
        return labels.some((label) => label && names.has(normalizeIconName(label)))
      })
      .map((option) => normalizeIconUnicode(option.iconUnicode))
      .filter(Boolean)
  )
  return icons.filter(
    (icon) => !icon.custom && icon.unicode && (unicodes.has(icon.unicode) || icon.label.split(' / ').some((label) => names.has(normalizeIconName(label.replace(/\s*\([^)]*\)/g, '')))))
  )
}
