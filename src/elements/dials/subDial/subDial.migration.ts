import type { SubDialContentConfig, SubDialElementConfig } from '@/types/elements/subDial'
import { subDialSchema } from './subDial.schema'

export type MigratedSubDialConfig = SubDialElementConfig
type PartialContent = { [Key in keyof SubDialContentConfig]?: Partial<SubDialContentConfig[Key]> }
type MigrationInput = Record<string, any> & { content?: PartialContent }

function mergeKnown<T extends object>(defaults: T, input?: Partial<T>): T {
  return Object.fromEntries(
    Object.keys(defaults).map((key) => {
      const typedKey = key as keyof T
      return [key, input?.[typedKey] ?? defaults[typedKey]]
    })
  ) as T
}

function migrateContent(input: MigrationInput): SubDialContentConfig {
  const defaults = subDialSchema.defaultConfig.content
  const content = input.content ?? {}

  return {
    icon: mergeKnown(defaults.icon, content.icon),
    label: mergeKnown(defaults.label, content.label),
    value: mergeKnown({
      ...defaults.value,
      ...(input.showValue === undefined ? {} : { visible: input.showValue }),
      ...(input.decimals === undefined ? {} : { decimals: input.decimals }),
      ...(input.valueColor === undefined ? {} : { color: input.valueColor }),
      ...(input.valueFontSize === undefined ? {} : { fontSize: input.valueFontSize }),
    }, content.value),
    unit: mergeKnown({
      ...defaults.unit,
      ...(input.showUnit === undefined ? {} : { visible: input.showUnit }),
      ...(input.unit === undefined ? {} : { suffix: input.unit }),
    }, content.unit),
    goalValue: mergeKnown(defaults.goalValue, content.goalValue),
    percentage: mergeKnown(defaults.percentage, content.percentage)
  }
}

export function migrateSubDialConfig<Extra extends object = Record<never, never>>(
  input: MigrationInput & Extra = {} as MigrationInput & Extra
): MigratedSubDialConfig {
  const defaults = subDialSchema.defaultConfig
  const {
    showValue: _defaultShowValue,
    showUnit: _defaultShowUnit,
    unit: _defaultUnit,
    decimals: _defaultDecimals,
    valueColor: _defaultValueColor,
    valueFontSize: _defaultValueFontSize,
    ...currentDefaults
  } = defaults
  const allowedKeys = [
    ...Object.keys(currentDefaults),
    'fill', 'fontFamily', 'fontSize', 'topBase', 'displayStates',
  ]
  const current = Object.fromEntries(
    allowedKeys
      .filter((key) => input[key as keyof MigrationInput] !== undefined)
      .map((key) => [key, input[key as keyof MigrationInput]])
  ) as Partial<MigratedSubDialConfig>

  return {
    ...currentDefaults,
    ...current,
    id: String(input.id ?? ''),
    eleType: 'subDial',
    dialProperty: String(input.dialProperty ?? ''),
    progressMode: input.progressMode === 'range' ? 'range' : 'goal',
    ...(!input.dialProperty && (input.progressProperty || input.goalProperty || ['auto', 'custom'].includes(input.progressMode))
      ? { needsDialMigration: true }
      : {}),
    content: migrateContent(input),
    pointer: { ...defaults.pointer, ...input.pointer }
  }
}
