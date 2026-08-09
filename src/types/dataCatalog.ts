export interface LocalizedText {
  readonly eng: string
  readonly zhs: string
}

export type DataTypeCategory = 'field' | 'goal' | 'chart' | 'indicator' | 'date' | 'weather'

export interface DataTypeOption {
  readonly valueCode: number
  readonly metricSymbol: string
  readonly category: DataTypeCategory
  readonly settingsLabel: LocalizedText
  readonly label: LocalizedText
  readonly unitKey: string
  readonly iconUnicode: string
  readonly defaultValue: string
  readonly isActive: 1
  readonly sortOrder: number
  readonly dialMode: 'goal' | 'range' | null
  readonly dialMin: number | null
  readonly dialMax: number | null
  readonly dialGoalSource: 'garmin' | 'fixed' | null
}

export interface DataUnitVariant {
  readonly aliases: readonly string[]
  readonly label: LocalizedText
}

export interface DataUnitDefinition {
  readonly unitKey: string
  readonly name: string
  readonly defaultVariant: string | null
  readonly variants: Readonly<Record<string, DataUnitVariant>>
  readonly isActive: 1
  readonly sortOrder: number
  readonly description: string | null
}

export interface DataCatalogSnapshot {
  readonly catalogVersion: number
  readonly dataTypeOptions: readonly DataTypeOption[]
  readonly unitDefinitions: readonly DataUnitDefinition[]
}

export interface UnitVariantOwner {
  readonly unitKey: string
  readonly variantKey: string
}

export interface ReadonlyLookup<K, V> extends Iterable<readonly [K, V]> {
  readonly size: number
  get(key: K): V | undefined
  has(key: K): boolean
  entries(): IterableIterator<[K, V]>
  keys(): IterableIterator<K>
  values(): IterableIterator<V>
}

export interface ValidatedDataCatalog extends DataCatalogSnapshot {
  readonly unitsByKey: ReadonlyLookup<string, DataUnitDefinition>
  readonly aliasOwners: ReadonlyLookup<string, UnitVariantOwner>
  readonly optionsByValueCode: ReadonlyLookup<number, DataTypeOption>
  readonly optionsByMetricSymbol: ReadonlyLookup<string, DataTypeOption>
}
