import type { PropertyOption } from '@/types/properties'
import { normalizeRgb565Hex } from '@/utils/rgb565Color'

const SIMPLIFIED_CHINESE_COLOR_LABELS: Record<string, string> = {
  Default: '默认',
  Transparent: '透明',
  White: '白色',
  'Dark Gray': '深灰色',
  'Light Gray': '浅灰色',
  Yellow: '黄色',
  Lime: '青柠色',
  'Bright Green': '亮绿色',
  Green: '绿色',
  'Spring Green': '春绿色',
  'Bright Aquamarine': '亮碧绿色',
  Cyan: '青色',
  Azure: '天蓝色',
  'Denim Blue': '牛仔蓝',
  Blue: '蓝色',
  'Electric Indigo': '电光靛蓝',
  Violet: '紫罗兰色',
  Magenta: '洋红色',
  Pink: '粉色',
  'Torch Red': '火炬红',
  Red: '红色',
  'Strong Orange': '鲜橙色',
  Orange: '橙色',
  'Olive Green': '橄榄绿',
  'Fruit Salad': '果绿色',
  'Tradewind Blue': '信风蓝',
  'Rich Blue': '浓蓝色',
  'Tapestry Purple': '织锦紫',
  'Blossom Red': '花红色',
  Lemon: '柠檬黄',
  'Green Yellow': '黄绿色',
  'Screamin Green': '荧光绿',
  Aquamarine: '碧绿色',
  'Baby Blue': '婴儿蓝',
  'Maya Blue': '玛雅蓝',
  'Neon Blue': '霓虹蓝',
  'Pale Violet': '淡紫色',
  Flamingo: '火烈鸟粉',
  'Brilliant Rose': '亮玫红',
  Tomato: '番茄红',
  'Pale Orange': '淡橙色',
  Canary: '金丝雀黄',
  Mint: '薄荷绿',
  'Pale Blue': '淡蓝色',
  Lavender: '薰衣草紫',
  Rose: '玫瑰色',
  Lilac: '丁香紫',
  Citrus: '柑橘黄',
  Limeade: '青柠绿',
  'Dark Green': '深绿色',
  'Green Haze': '绿雾色',
  'Persian Green': '波斯绿',
  Cobalt: '钴蓝色',
  'Dark Blue': '深蓝色',
  Purple: '紫色',
  'Dark Magenta': '深洋红',
  Lipstick: '口红色',
  'Dark Red': '深红色',
  'Tawny Orange': '黄褐橙',
  'Verdun Green': '凡尔登绿',
  'Darkest Green': '墨绿色',
  'Sherpa Blue': '夏尔巴蓝',
  'Navy Blue': '海军蓝',
  'Tyrian Purple': '泰尔紫',
  Maroon: '栗色',
  Black: '黑色'
}

export const getColorPropertyOptionDisplayLabel = (label: string, locale: string): string => {
  if (locale !== 'zh') return label
  return SIMPLIFIED_CHINESE_COLOR_LABELS[label] || label
}

export const normalizeRgb565GarminColor = (value: unknown): string => `0x${normalizeRgb565Hex(value).slice(1).toLowerCase()}`

export const buildColorPropertyOptions = (defaultColor: unknown, standardColors: PropertyOption[]): PropertyOption[] => {
  const defaultValue = normalizeRgb565GarminColor(defaultColor)

  return [
    { label: 'Default', value: defaultValue },
    ...standardColors.filter((option) => normalizeRgb565GarminColor(option.value) !== defaultValue).map((option) => ({ ...option })),
    { label: 'Transparent', value: '-1' }
  ]
}

export const updateColorPropertyDefault = (options: PropertyOption[], defaultColor: unknown): PropertyOption[] => {
  const defaultValue = normalizeRgb565GarminColor(defaultColor)
  const remaining = options
    .filter((option, index) => index > 0 && (option.value === '-1' || normalizeRgb565GarminColor(option.value) !== defaultValue))
    .map((option) => ({ ...option }))
  return [{ label: 'Default', value: defaultValue }, ...remaining]
}

export const removeColorPropertyOption = (options: PropertyOption[], index: number): PropertyOption[] => {
  if (index <= 0 || index >= options.length) return options.map((option) => ({ ...option }))
  return options.filter((_, optionIndex) => optionIndex !== index).map((option) => ({ ...option }))
}

export const moveColorPropertyOption = (options: PropertyOption[], index: number, direction: 'up' | 'down'): PropertyOption[] => {
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (index <= 0 || targetIndex <= 0 || index >= options.length || targetIndex >= options.length) {
    return options.map((option) => ({ ...option }))
  }
  const next = options.map((option) => ({ ...option }))
  ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
  return next
}
