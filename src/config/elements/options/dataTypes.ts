import type { DataTypeOption as CanonicalDataTypeOption } from '@/types/dataCatalog'
import type { DataUnitDefinition } from '@/types/dataCatalog'
import type { DataTypeOption } from '@/types/settings'

// Temporary compatibility bridge for consumers migrated in Studio Task 2.
// It is populated exclusively from an already validated canonical snapshot.
const compatibilityDataTypeOptions: DataTypeOption[] = []
export const DataTypeOptions: readonly DataTypeOption[] = compatibilityDataTypeOptions

export let dataTypeOptionsLoaded = false
export let dataTypeOptionsLoadError: unknown = null

const toCompatibilityOption = (option: CanonicalDataTypeOption, unitsByKey: ReadonlyMap<string, DataUnitDefinition>): DataTypeOption => {
  const unit = unitsByKey.get(option.unitKey)
  const defaultVariant = unit?.defaultVariant
  return {
    labelCn: option.label.zhs,
    metricSymbol: option.metricSymbol,
    value: option.valueCode,
    defaultValue: option.defaultValue,
    icon: option.iconUnicode,
    iconUnicode: option.iconUnicode,
    sortOrder: option.sortOrder,
    unitKey: option.unitKey,
    unit: defaultVariant ? unit?.variants[defaultVariant].label.eng : '',
    label: option.label.eng,
    enLabel: option.label.eng,
    dialMode: option.dialMode,
    dialMin: option.dialMin,
    dialMax: option.dialMax,
    dialGoalSource: option.dialGoalSource
  }
}

export function replaceDataTypeOptionsFromCatalog(options: readonly CanonicalDataTypeOption[], unitsByKey: ReadonlyMap<string, DataUnitDefinition>) {
  const compatibilityOptions = options.map((option) => toCompatibilityOption(option, unitsByKey)).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.value - b.value)
  compatibilityDataTypeOptions.splice(0, compatibilityDataTypeOptions.length, ...compatibilityOptions)
  dataTypeOptionsLoaded = true
  dataTypeOptionsLoadError = null
}

export function reportDataTypeOptionsLoadError(error: unknown) {
  dataTypeOptionsLoadError = error
}
