import type { DataTypeOption } from '@/types/dataCatalog'

const ELIGIBLE_CATEGORIES = new Set<DataTypeOption['category']>(['field', 'indicator', 'weather'])

export function getConnectIqEligibleDataTypes(options: readonly DataTypeOption[]): DataTypeOption[] {
  return options.filter((option) => option.isActive === 1 && ELIGIBLE_CATEGORIES.has(option.category))
}

export function getConnectIqSelectedDataTypeValues(
  options: readonly DataTypeOption[],
  exclusions: readonly number[],
): number[] {
  const excluded = new Set(exclusions)
  return getConnectIqEligibleDataTypes(options)
    .map((option) => option.valueCode)
    .filter((value) => !excluded.has(value))
}

export function selectAllConnectIqDataTypes(
  options: readonly DataTypeOption[],
  exclusions: readonly number[],
): number[] {
  const eligible = new Set(getConnectIqEligibleDataTypes(options).map((option) => option.valueCode))
  return exclusions.filter((value) => !eligible.has(value))
}

export function clearAllConnectIqDataTypes(
  options: readonly DataTypeOption[],
  exclusions: readonly number[],
): number[] {
  const next = new Set(exclusions)
  for (const option of getConnectIqEligibleDataTypes(options)) next.add(option.valueCode)
  return Array.from(next).sort((left, right) => left - right)
}
