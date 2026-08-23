export interface LocalizedText {
  readonly eng: string
  readonly zhs: string
}

export interface DataLabel {
  readonly eng: { readonly short: string; readonly medium: string; readonly long: string }
  readonly zhs: string
}

export type DataTypeCategory = 'field' | 'goal' | 'chart' | 'indicator' | 'date' | 'date_cn' | 'weather'

export interface DataTypeOption {
  readonly valueCode: number
  readonly formatterCode?: number | null
  readonly metricSymbol: string
  readonly category: DataTypeCategory
  readonly settingsLabel: LocalizedText
  readonly label: DataLabel
  readonly unitKey: string
  readonly iconUnicode: string
  readonly defaultValue: string
  readonly isActive: 1
  readonly systemDefault?: 0 | 1
  readonly sortOrder: number
  readonly dialMode: 'goal' | 'range' | 'direction' | null
  readonly dialMin: number | null
  readonly dialMax: number | null
  readonly dialGoalSource: 'garmin' | null
  readonly dialDirectionUnit?: 'degree' | null
  readonly appLanguage?: import('@/types/localization').AppLanguage | null
}

export interface DataUnitVariant {
  readonly aliases: readonly string[]
  readonly label: LocalizedText
}

export type DataUnitSelectionPolicy =
  | { readonly type: 'none' }
  | { readonly type: 'fixed'; readonly variant: string }
  | {
      readonly type: 'deviceSetting'
      readonly setting: 'distanceUnits' | 'temperatureUnits'
      readonly mapping: { readonly metric: string; readonly statute: string }
    }
  | { readonly type: 'provider'; readonly fallbackVariant?: string }

export interface DataUnitDefinition {
  readonly unitKey: string
  readonly name: string
  readonly defaultVariant: string | null
  readonly selectionPolicy: DataUnitSelectionPolicy
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
