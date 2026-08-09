import { defineStore } from 'pinia'
import { getDataCatalog } from '@/api/data-catalog'
import { reportDataTypeOptionsLoadError, replaceDataTypeOptionsFromCatalog } from '@/config/elements/options/dataTypes'
import type { DataTypeCategory, DataTypeOption, DataUnitDefinition, DataUnitVariant, LocalizedText, UnitVariantOwner, ValidatedDataCatalog } from '@/types/dataCatalog'

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/
const SYMBOL_PATTERN = /^:[A-Z][A-Z0-9_]*$/
const CATEGORIES = new Set<DataTypeCategory>(['field', 'goal', 'chart', 'indicator', 'date', 'weather'])

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

const requiredString = (value: unknown, path: string): string => {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${path} is required`)
  return value
}

const exactKey = (value: unknown, path: string): string => {
  if (typeof value !== 'string' || !KEY_PATTERN.test(value)) {
    throw new Error(`${path} must match ^[a-z][a-z0-9_]*$`)
  }
  return value
}

const localizedText = (value: unknown, path: string): LocalizedText => {
  if (!isRecord(value)) throw new Error(`${path}.eng is required`)
  return {
    eng: requiredString(value.eng, `${path}.eng`),
    zhs: requiredString(value.zhs, `${path}.zhs`)
  }
}

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
    const normalized = raw.trim().toLocaleLowerCase('en-US')
    if (variantAliases.has(normalized)) throw new Error(`duplicate alias '${normalized}'`)
    variantAliases.add(normalized)
    const owner = aliasOwners.get(normalized)
    if (owner && (owner.unitKey !== unitKey || owner.variantKey !== variantKey)) {
      throw new Error(`alias '${normalized}' is owned by both ${owner.unitKey}/${owner.variantKey} and ${unitKey}/${variantKey}`)
    }
    aliasOwners.set(normalized, { unitKey, variantKey })
    return raw
  })
  return { aliases, label: localizedText(value.label, `${path}.label`) }
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
  const variants: Record<string, DataUnitVariant> = {}
  for (const [variantKey, variant] of variantEntries) {
    exactKey(variantKey, `${path}.variantKey`)
    variants[variantKey] = validateVariant(variant, `${path}.variants.${variantKey}`, unitKey, variantKey, aliasOwners)
  }
  if (defaultVariant !== null && !variants[defaultVariant]) {
    throw new Error(`${path}.defaultVariant '${defaultVariant}' is not defined`)
  }
  if (value.description !== null && typeof value.description !== 'string') {
    throw new Error(`${path}.description must be a string or null`)
  }
  return {
    unitKey,
    name,
    defaultVariant,
    variants,
    isActive,
    sortOrder,
    description: value.description as string | null
  }
}

const validateOption = (value: unknown, index: number): DataTypeOption => {
  const path = `dataTypeOptions[${index}]`
  if (!isRecord(value)) throw new Error(`${path} is required`)
  const valueCode = nonnegativeInteger(value.valueCode, `${path}.valueCode`)
  const prefix = `valueCode ${valueCode}`
  const metricSymbol = requiredString(value.metricSymbol, `${prefix}: metricSymbol`)
  if (!SYMBOL_PATTERN.test(metricSymbol)) throw new Error(`${prefix}: metricSymbol must match ^:[A-Z][A-Z0-9_]*$`)
  if (typeof value.category !== 'string' || !CATEGORIES.has(value.category as DataTypeCategory)) {
    throw new Error(`${prefix}: category is unsupported`)
  }
  const defaultValue = value.defaultValue
  if (typeof defaultValue !== 'string') throw new Error(`${prefix}: defaultValue is required`)
  const dialMode = value.dialMode
  if (dialMode !== null && dialMode !== 'goal' && dialMode !== 'range') {
    throw new Error(`${prefix}: dialMode must be goal, range, or null`)
  }
  const dialGoalSource = value.dialGoalSource
  if (dialGoalSource !== null && dialGoalSource !== 'garmin' && dialGoalSource !== 'fixed') {
    throw new Error(`${prefix}: dialGoalSource must be garmin, fixed, or null`)
  }
  return {
    valueCode,
    metricSymbol,
    category: value.category as DataTypeCategory,
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
  }
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
  const dataTypeOptions = value.dataTypeOptions.map((option, index) => {
    const validated = validateOption(option, index)
    if (valueCodes.has(validated.valueCode)) throw new Error(`duplicate valueCode ${validated.valueCode}`)
    if (symbols.has(validated.metricSymbol)) throw new Error(`duplicate metricSymbol ${validated.metricSymbol}`)
    valueCodes.add(validated.valueCode)
    symbols.add(validated.metricSymbol)
    if (!unitsByKey.has(validated.unitKey)) {
      throw new Error(`unitKey '${validated.unitKey}' does not reference an active unit`)
    }
    return validated
  })
  return {
    catalogVersion: value.catalogVersion as number,
    dataTypeOptions,
    unitDefinitions,
    unitsByKey,
    aliasOwners
  }
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
    options: (state) => state.snapshot?.dataTypeOptions ?? [],
    unitDefinitions: (state) => state.snapshot?.unitDefinitions ?? [],
    unitsByKey: (state) => state.snapshot?.unitsByKey ?? new Map<string, DataUnitDefinition>(),
    aliasOwners: (state) => state.snapshot?.aliasOwners ?? new Map<string, UnitVariantOwner>()
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
          replaceDataTypeOptionsFromCatalog(snapshot.dataTypeOptions, snapshot.unitsByKey)
          this.snapshot = snapshot
          return snapshot
        })
        .catch((error: unknown) => {
          const normalized = error instanceof Error ? error : new Error(String(error))
          this.error = normalized.message
          reportDataTypeOptionsLoadError(normalized)
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
