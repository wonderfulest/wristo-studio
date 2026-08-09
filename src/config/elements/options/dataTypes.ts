import type { DataTypeOption as CanonicalDataTypeOption, DataUnitDefinition, ReadonlyLookup } from '@/types/dataCatalog'
import type { DataTypeOption } from '@/types/settings'

// Temporary compatibility bridge for consumers migrated in Studio Task 2.
// It is populated exclusively from an already validated canonical snapshot.
// The exported proxy identity is stable; successful loads atomically swap its
// frozen backing snapshot, while every external mutation path remains blocked.
let compatibilitySnapshot: readonly DataTypeOption[] = Object.freeze([])
const compatibilityProxyTarget: DataTypeOption[] = []
const readonlyMutation = () => {
  throw new TypeError('DataTypeOptions is readonly')
}
export const DataTypeOptions: readonly DataTypeOption[] = new Proxy(compatibilityProxyTarget, {
  get: (_target, property) => {
    const value = Reflect.get(compatibilitySnapshot, property)
    return typeof value === 'function'
      ? (...args: unknown[]) => Reflect.apply(Reflect.get(compatibilitySnapshot, property), compatibilitySnapshot, args)
      : value
  },
  has: (_target, property) => Reflect.has(compatibilitySnapshot, property),
  ownKeys: () => Reflect.ownKeys(compatibilitySnapshot),
  getOwnPropertyDescriptor: (target, property) => {
    if (property === 'length') return Reflect.getOwnPropertyDescriptor(target, property)
    const descriptor = Reflect.getOwnPropertyDescriptor(compatibilitySnapshot, property)
    return descriptor ? { ...descriptor, configurable: true } : undefined
  },
  set: readonlyMutation,
  deleteProperty: readonlyMutation,
  defineProperty: readonlyMutation
})

export let dataTypeOptionsLoaded = false
export let dataTypeOptionsLoadError: unknown = null

const toCompatibilityOption = (option: CanonicalDataTypeOption, unitsByKey: ReadonlyLookup<string, DataUnitDefinition>): DataTypeOption => {
  const unit = unitsByKey.get(option.unitKey)
  const defaultVariant = unit?.defaultVariant
  return Object.freeze({
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
  })
}

export function replaceDataTypeOptionsFromCatalog(options: readonly CanonicalDataTypeOption[], unitsByKey: ReadonlyLookup<string, DataUnitDefinition>) {
  const compatibilityOptions = options.map((option) => toCompatibilityOption(option, unitsByKey)).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.value - b.value)
  compatibilitySnapshot = Object.freeze(compatibilityOptions)
  compatibilityProxyTarget.length = compatibilitySnapshot.length
  dataTypeOptionsLoaded = true
  dataTypeOptionsLoadError = null
}

export function reportDataTypeOptionsLoadError(error: unknown) {
  dataTypeOptionsLoadError = error
}
