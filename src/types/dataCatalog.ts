export interface LocalizedText {
  eng: string
  zhs: string
}

export type DataTypeCategory = 'field' | 'goal' | 'chart' | 'indicator' | 'date' | 'weather'

export interface DataTypeOption {
  valueCode: number
  metricSymbol: string
  category: DataTypeCategory
  settingsLabel: LocalizedText
  label: LocalizedText
  unitKey: string
  iconUnicode: string
  defaultValue: string
  isActive: 1
  sortOrder: number
  dialMode: 'goal' | 'range' | null
  dialMin: number | null
  dialMax: number | null
  dialGoalSource: 'garmin' | 'fixed' | null
}

export interface DataUnitVariant {
  aliases: string[]
  label: LocalizedText
}

export interface DataUnitDefinition {
  unitKey: string
  name: string
  defaultVariant: string | null
  variants: Record<string, DataUnitVariant>
  isActive: 1
  sortOrder: number
  description: string | null
}

export interface DataCatalogSnapshot {
  catalogVersion: number
  dataTypeOptions: DataTypeOption[]
  unitDefinitions: DataUnitDefinition[]
}

export interface UnitVariantOwner {
  unitKey: string
  variantKey: string
}

export interface ValidatedDataCatalog extends DataCatalogSnapshot {
  unitsByKey: Map<string, DataUnitDefinition>
  aliasOwners: Map<string, UnitVariantOwner>
}
