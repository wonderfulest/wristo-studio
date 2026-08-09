import { defineStore } from 'pinia'
import { getDataCatalog } from '@/api/data-catalog'
import type { DataTypeCategory, DataTypeOption, DataUnitDefinition, DataUnitSelectionPolicy, DataUnitVariant, LocalizedText, ReadonlyLookup, UnitVariantOwner, ValidatedDataCatalog } from '@/types/dataCatalog'

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/
const SYMBOL_PATTERN = /^:[A-Z][A-Z0-9_]*$/
const CATEGORIES = new Set<DataTypeCategory>(['field', 'goal', 'chart', 'indicator', 'date', 'weather'])
const hasOwn = (Object as unknown as { hasOwn(object: object, property: PropertyKey): boolean }).hasOwn

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const requiredString = (value: unknown, path: string): string => {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${path} is required`)
  return value.trim()
}

const exactKey = (value: unknown, path: string): string => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!KEY_PATTERN.test(normalized)) {
    throw new Error(`${path} must match ^[a-z][a-z0-9_]*$`)
  }
  return normalized
}

const localizedText = (value: unknown, path: string): LocalizedText => {
  if (!isRecord(value)) throw new Error(`${path}.eng is required`)
  return Object.freeze({
    eng: requiredString(value.eng, `${path}.eng`),
    zhs: requiredString(value.zhs, `${path}.zhs`)
  })
}

const readonlyLookup = <K, V>(source: Map<K, V>): ReadonlyLookup<K, V> => Object.freeze({
  get: (key: K) => source.get(key),
  has: (key: K) => source.has(key),
  entries: () => source.entries(),
  keys: () => source.keys(),
  values: () => source.values(),
  get size() {
    return source.size
  },
  [Symbol.iterator]: () => source[Symbol.iterator]()
})

const EMPTY_UNITS = readonlyLookup(new Map<string, DataUnitDefinition>())
const EMPTY_ALIASES = readonlyLookup(new Map<string, UnitVariantOwner>())
const EMPTY_OPTIONS = Object.freeze([]) as readonly DataTypeOption[]

export type DataTypePropertyOption = Omit<DataTypeOption, 'label'> & {
  readonly value: number
  readonly label: string
  readonly dataLabel: LocalizedText
  readonly icon: string
}

export function getDataTypePropertyOptions(): DataTypePropertyOption[] {
  return useDataCatalogStore().options.map((option) => ({
    ...option,
    value: option.valueCode,
    label: option.label.eng,
    dataLabel: option.label,
    icon: option.iconUnicode,
  }))
}
const EMPTY_UNIT_DEFINITIONS = Object.freeze([]) as readonly DataUnitDefinition[]

const nonnegativeInteger = (value: unknown, path: string): number => {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`${path} must be a nonnegative integer`)
  }
  return value as number
}

const active = (value: unknown, path: string): 1 => {
  if (value !== 1) throw new Error(`${path} must be 1`)
  return 1
}

const nullableNumber = (value: unknown, path: string): number | null => {
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${path} must be a number or null`)
  return value
}

const validateVariant = (value: unknown, path: string, unitKey: string, variantKey: string, aliasOwners: Map<string, UnitVariantOwner>): DataUnitVariant => {
  if (!isRecord(value)) throw new Error(`${path} is required`)
  if (!Array.isArray(value.aliases) || value.aliases.length === 0) {
    throw new Error(`${path}.aliases must be a non-empty array`)
  }
  const variantAliases = new Set<string>()
  const aliases = value.aliases.map((alias, index) => {
    const raw = requiredString(alias, `${path}.aliases[${index}]`)
    const normalized = raw.toLowerCase()
    if (variantAliases.has(normalized)) throw new Error(`duplicate alias '${normalized}'`)
    variantAliases.add(normalized)
    const owner = aliasOwners.get(normalized)
    if (owner && (owner.unitKey !== unitKey || owner.variantKey !== variantKey)) {
      throw new Error(`alias '${normalized}' is owned by both ${owner.unitKey}/${owner.variantKey} and ${unitKey}/${variantKey}`)
    }
    aliasOwners.set(normalized, Object.freeze({ unitKey, variantKey }))
    return normalized
  })
  return Object.freeze({
    aliases: Object.freeze(aliases),
    label: localizedText(value.label, `${path}.label`)
  })
}

const validateUnit = (value: unknown, index: number, aliasOwners: Map<string, UnitVariantOwner>): DataUnitDefinition => {
  const path = `unitDefinitions[${index}]`
  if (!isRecord(value)) throw new Error(`${path} is required`)
  const unitKey = exactKey(value.unitKey, `${path}.unitKey`)
  const name = requiredString(value.name, `${path}.name`)
  const isActive = active(value.isActive, `${path}.isActive`)
  const sortOrder = nonnegativeInteger(value.sortOrder, `${path}.sortOrder`)
  if (!isRecord(value.variants)) throw new Error(`${path}.variants must be an object`)
  const variantEntries = Object.entries(value.variants)
  let defaultVariant: string | null
  if (unitKey === 'none') {
    if (value.defaultVariant !== null) throw new Error(`${path}.defaultVariant must be null for unitKey none`)
    if (variantEntries.length !== 0) throw new Error(`${path}.variants must be empty for unitKey none`)
    defaultVariant = null
  } else {
    if (variantEntries.length === 0) {
      throw new Error(`${path}.variants must contain at least one variant for active unit ${unitKey}`)
    }
    if (value.defaultVariant === null) {
      throw new Error(`${path}.defaultVariant is required for active unit ${unitKey}`)
    }
    defaultVariant = exactKey(value.defaultVariant, `${path}.defaultVariant`)
  }
  const variants = Object.create(null) as Record<string, DataUnitVariant>
  for (const [rawVariantKey, variant] of variantEntries) {
    const variantKey = exactKey(rawVariantKey, `${path}.variantKey`)
    if (hasOwn(variants, variantKey)) throw new Error(`${path}.duplicate variantKey '${variantKey}'`)
    variants[variantKey] = validateVariant(variant, `${path}.variants.${variantKey}`, unitKey, variantKey, aliasOwners)
  }
  if (defaultVariant !== null && !hasOwn(variants, defaultVariant)) {
    throw new Error(`${path}.defaultVariant '${defaultVariant}' is not defined`)
  }
  const selectionPolicy = validateSelectionPolicy(value.selectionPolicy, path, unitKey, variants)
  if (value.description !== null && typeof value.description !== 'string') {
    throw new Error(`${path}.description must be a string or null`)
  }
  const description = value.description === null ? null : (value.description as string).trim()
  return Object.freeze({
    unitKey,
    name,
    defaultVariant,
    selectionPolicy,
    variants: Object.freeze(variants),
    isActive,
    sortOrder,
    description
  })
}

const validateSelectionPolicy = (
  value: unknown,
  unitPath: string,
  unitKey: string,
  variants: Readonly<Record<string, DataUnitVariant>>,
): DataUnitSelectionPolicy => {
  const path = `${unitPath}.selectionPolicy`
  if (!isRecord(value)) throw new Error(`${path} is required`)
  const type = requiredString(value.type, `${path}.type`)
  if (type === 'none') {
    if (unitKey !== 'none') throw new Error(`${path}.type none is only valid for unitKey none`)
    return Object.freeze({ type })
  }
  if (unitKey === 'none') throw new Error(`${path}.type must be none for unitKey none`)
  if (type === 'fixed') {
    const variant = exactKey(value.variant, `${path}.variant`)
    if (!hasOwn(variants, variant)) throw new Error(`${path}.variant ${variant} does not exist`)
    return Object.freeze({ type, variant })
  }
  if (type === 'deviceSetting') {
    if (value.setting !== 'distanceUnits' && value.setting !== 'temperatureUnits') {
      throw new Error(`${path}.setting is unsupported`)
    }
    if (!isRecord(value.mapping)) throw new Error(`${path}.mapping is required`)
    const metric = exactKey(value.mapping.metric, `${path}.mapping.metric`)
    const statute = exactKey(value.mapping.statute, `${path}.mapping.statute`)
    if (!hasOwn(variants, metric)) throw new Error(`${path}.mapping.metric variant ${metric} does not exist`)
    if (!hasOwn(variants, statute)) throw new Error(`${path}.mapping.statute variant ${statute} does not exist`)
    return Object.freeze({
      type,
      setting: value.setting,
      mapping: Object.freeze({ metric, statute }),
    })
  }
  if (type === 'provider') {
    if (value.fallbackVariant === undefined || value.fallbackVariant === null) {
      return Object.freeze({ type })
    }
    const fallbackVariant = exactKey(value.fallbackVariant, `${path}.fallbackVariant`)
    if (!hasOwn(variants, fallbackVariant)) {
      throw new Error(`${path}.fallbackVariant ${fallbackVariant} does not exist`)
    }
    return Object.freeze({ type, fallbackVariant })
  }
  throw new Error(`${path}.type is unsupported`)
}

const validateOption = (value: unknown, index: number): DataTypeOption => {
  const path = `dataTypeOptions[${index}]`
  if (!isRecord(value)) throw new Error(`${path} is required`)
  const valueCode = nonnegativeInteger(value.valueCode, `${path}.valueCode`)
  const prefix = `valueCode ${valueCode}`
  const metricSymbol = requiredString(value.metricSymbol, `${prefix}: metricSymbol`)
  if (!SYMBOL_PATTERN.test(metricSymbol)) throw new Error(`${prefix}: metricSymbol must match ^:[A-Z][A-Z0-9_]*$`)
  const category = typeof value.category === 'string' ? value.category.trim() : ''
  if (!CATEGORIES.has(category as DataTypeCategory)) {
    throw new Error(`${prefix}: category is unsupported`)
  }
  const defaultValue = typeof value.defaultValue === 'string' ? value.defaultValue.trim() : value.defaultValue
  if (typeof defaultValue !== 'string') throw new Error(`${prefix}: defaultValue is required`)
  const dialMode = typeof value.dialMode === 'string' ? value.dialMode.trim() : value.dialMode
  if (dialMode !== null && dialMode !== 'goal' && dialMode !== 'range') {
    throw new Error(`${prefix}: dialMode must be goal, range, or null`)
  }
  const dialGoalSource = typeof value.dialGoalSource === 'string' ? value.dialGoalSource.trim() : value.dialGoalSource
  if (dialGoalSource !== null && dialGoalSource !== 'garmin' && dialGoalSource !== 'fixed') {
    throw new Error(`${prefix}: dialGoalSource must be garmin, fixed, or null`)
  }
  return Object.freeze({
    valueCode,
    metricSymbol,
    category: category as DataTypeCategory,
    settingsLabel: localizedText(value.settingsLabel, `${prefix}: settingsLabel`),
    label: localizedText(value.label, `${prefix}: label`),
    unitKey: exactKey(value.unitKey, `${prefix}: unitKey`),
    iconUnicode: requiredString(value.iconUnicode, `${prefix}: iconUnicode`),
    defaultValue,
    isActive: active(value.isActive, `${prefix}: isActive`),
    sortOrder: nonnegativeInteger(value.sortOrder, `${prefix}: sortOrder`),
    dialMode,
    dialMin: nullableNumber(value.dialMin, `${prefix}: dialMin`),
    dialMax: nullableNumber(value.dialMax, `${prefix}: dialMax`),
    dialGoalSource
  })
}

export const validateDataCatalog = (value: unknown): ValidatedDataCatalog => {
  if (!isRecord(value)) throw new Error('catalog response data is required')
  if (!Number.isInteger(value.catalogVersion) || (value.catalogVersion as number) <= 0) {
    throw new Error('catalogVersion must be a positive integer')
  }
  if (!Array.isArray(value.dataTypeOptions)) throw new Error('dataTypeOptions must be an array')
  if (!Array.isArray(value.unitDefinitions)) throw new Error('unitDefinitions must be an array')

  const aliasOwners = new Map<string, UnitVariantOwner>()
  const unitsByKey = new Map<string, DataUnitDefinition>()
  const unitDefinitions = value.unitDefinitions.map((unit, index) => {
    const validated = validateUnit(unit, index, aliasOwners)
    if (unitsByKey.has(validated.unitKey)) throw new Error(`duplicate unitKey '${validated.unitKey}'`)
    unitsByKey.set(validated.unitKey, validated)
    return validated
  })
  const valueCodes = new Set<number>()
  const symbols = new Set<string>()
  const optionsByValueCode = new Map<number, DataTypeOption>()
  const optionsByMetricSymbol = new Map<string, DataTypeOption>()
  const dataTypeOptions = value.dataTypeOptions.map((option, index) => {
    const validated = validateOption(option, index)
    if (valueCodes.has(validated.valueCode)) throw new Error(`duplicate valueCode ${validated.valueCode}`)
    if (symbols.has(validated.metricSymbol)) throw new Error(`duplicate metricSymbol ${validated.metricSymbol}`)
    valueCodes.add(validated.valueCode)
    symbols.add(validated.metricSymbol)
    optionsByValueCode.set(validated.valueCode, validated)
    optionsByMetricSymbol.set(validated.metricSymbol, validated)
    if (!unitsByKey.has(validated.unitKey)) {
      throw new Error(`unitKey '${validated.unitKey}' does not reference an active unit`)
    }
    return validated
  })
  return Object.freeze({
    catalogVersion: value.catalogVersion as number,
    dataTypeOptions: Object.freeze(dataTypeOptions),
    unitDefinitions: Object.freeze(unitDefinitions),
    unitsByKey: readonlyLookup(unitsByKey),
    aliasOwners: readonlyLookup(aliasOwners),
    optionsByValueCode: readonlyLookup(optionsByValueCode),
    optionsByMetricSymbol: readonlyLookup(optionsByMetricSymbol)
  })
}

const pendingLoads = new WeakMap<object, Promise<ValidatedDataCatalog>>()

export const useDataCatalogStore = defineStore('dataCatalog', {
  state: (): { snapshot: ValidatedDataCatalog | null; loading: boolean; error: string | null } => ({
    snapshot: null,
    loading: false,
    error: null
  }),
  getters: {
    catalogVersion: (state) => state.snapshot?.catalogVersion ?? null,
    options: (state) => state.snapshot?.dataTypeOptions ?? EMPTY_OPTIONS,
    unitDefinitions: (state) => state.snapshot?.unitDefinitions ?? EMPTY_UNIT_DEFINITIONS,
    unitsByKey: (state) => state.snapshot?.unitsByKey ?? EMPTY_UNITS,
    aliasOwners: (state) => state.snapshot?.aliasOwners ?? EMPTY_ALIASES
  },
  actions: {
    load(force = false): Promise<ValidatedDataCatalog> {
      const current = pendingLoads.get(this)
      if (current) return current
      if (this.snapshot && !force) return Promise.resolve(this.snapshot)

      this.loading = true
      this.error = null
      const request = getDataCatalog()
        .then((result) => validateDataCatalog(result.data))
        .then((snapshot) => {
          this.snapshot = snapshot
          return snapshot
        })
        .catch((error: unknown) => {
          const normalized = error instanceof Error ? error : new Error(String(error))
          this.error = normalized.message
          throw normalized
        })
        .finally(() => {
          this.loading = false
          pendingLoads.delete(this)
        })
      pendingLoads.set(this, request)
      return request
    }
  }
})
