import type { PropertyOption } from '@/types/properties'
import { getColorPropertyOptionDisplayLabel } from './colorPropertyOptions'

type LocalizablePropertyOption = PropertyOption & {
  labelCn?: string
  settingsLabel?: { zhs?: string }
}

export function withSimplifiedChineseOptionLabel<T extends LocalizablePropertyOption>(option: T): T & { labelCn: string } {
  const labelCn = option.labelCn?.trim()
    || option.settingsLabel?.zhs?.trim()
    || getColorPropertyOptionDisplayLabel(option.label, 'zh')
  return { ...option, labelCn }
}

export function withSimplifiedChineseOptionLabels<T extends LocalizablePropertyOption>(options: readonly T[]): Array<T & { labelCn: string }> {
  return options.map(withSimplifiedChineseOptionLabel)
}
