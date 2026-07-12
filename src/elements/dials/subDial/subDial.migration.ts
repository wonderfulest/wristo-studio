import type { SubDialContentConfig, SubDialElementConfig } from '@/types/elements/subDial'
import { subDialSchema } from './subDial.schema'

type LegacySubDialKey = 'goalProperty' | 'showValue' | 'showUnit' | 'unit' | 'decimals' | 'valueColor' | 'valueFontSize'
export type MigratedSubDialConfig = Omit<SubDialElementConfig, LegacySubDialKey>
type PartialContent = { [Key in keyof SubDialContentConfig]?: Partial<SubDialContentConfig[Key]> }
type MigrationInput = Omit<Partial<SubDialElementConfig>, 'content'> & { content?: PartialContent } & Record<string, unknown>

function migrateContent(input: MigrationInput): SubDialContentConfig {
  const defaults = subDialSchema.defaultConfig.content
  const content = (input.content ?? {}) as Partial<SubDialContentConfig>

  return {
    icon: { ...defaults.icon, ...content.icon },
    label: { ...defaults.label, ...content.label },
    value: {
      ...defaults.value,
      ...(input.showValue === undefined ? {} : { visible: input.showValue }),
      ...(input.decimals === undefined ? {} : { decimals: input.decimals }),
      ...(input.valueColor === undefined ? {} : { color: input.valueColor }),
      ...(input.valueFontSize === undefined ? {} : { fontSize: input.valueFontSize }),
      ...content.value
    },
    unit: {
      ...defaults.unit,
      ...(input.showUnit === undefined ? {} : { visible: input.showUnit }),
      ...(input.unit === undefined ? {} : { suffix: input.unit }),
      ...content.unit
    },
    goalValue: { ...defaults.goalValue, ...content.goalValue },
    percentage: { ...defaults.percentage, ...content.percentage }
  }
}

export function migrateSubDialConfig(input: MigrationInput = {}): MigratedSubDialConfig {
  const defaults = subDialSchema.defaultConfig
  const {
    goalProperty: _defaultGoalProperty,
    showValue: _defaultShowValue,
    showUnit: _defaultShowUnit,
    unit: _defaultUnit,
    decimals: _defaultDecimals,
    valueColor: _defaultValueColor,
    valueFontSize: _defaultValueFontSize,
    ...currentDefaults
  } = defaults
  const {
    goalProperty: _goalProperty,
    showValue: _showValue,
    showUnit: _showUnit,
    unit: _unit,
    decimals: _decimals,
    valueColor: _valueColor,
    valueFontSize: _valueFontSize,
    ...current
  } = input

  return {
    ...currentDefaults,
    ...current,
    id: String(input.id ?? ''),
    eleType: 'subDial',
    progressProperty: String(input.progressProperty ?? input.goalProperty ?? ''),
    progressMode: input.progressMode ?? 'auto',
    content: migrateContent(input),
    pointer: { ...defaults.pointer, ...input.pointer }
  }
}
