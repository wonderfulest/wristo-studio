import type { SupportedLocale } from '@/stores/locale'
import type { DataTypePropertyOption } from '@/stores/dataCatalogStore'

export type DataPropertyOption = Omit<DataTypePropertyOption, 'value'> & {
  readonly value: unknown
  readonly name?: string
}

const cloneOption = <T extends object>(option: T): T => JSON.parse(JSON.stringify(option)) as T

export function resolveDataOptionsBySymbols(
  catalogOptions: readonly DataPropertyOption[],
  storedOptions: Readonly<Record<string, Record<string, any>>>,
  metricSymbols: readonly string[],
): DataPropertyOption[] {
  const bySymbol = new Map(catalogOptions.map((option) => [option.metricSymbol, option]))
  const seen = new Set<string>()
  const result: DataPropertyOption[] = []
  for (const metricSymbol of metricSymbols) {
    if (!metricSymbol || seen.has(metricSymbol)) continue
    seen.add(metricSymbol)
    const canonical = bySymbol.get(metricSymbol)
    const stored = storedOptions[metricSymbol]
    if (!canonical && !stored) continue
    result.push(cloneOption({
      ...(canonical || {}),
      ...(stored || {}),
      metricSymbol,
      value: metricSymbol,
    }) as DataPropertyOption)
  }
  return result
}

const createActiveFieldDataOptions = (catalogOptions: readonly DataTypePropertyOption[]): DataPropertyOption[] => (
  catalogOptions
    .filter((option) => option.category === 'field' && option.isActive === 1)
    .map(cloneOption)
)

export function createDefaultDataOptions(
  currentOptions: readonly DataPropertyOption[],
): DataPropertyOption[] {
  return currentOptions.filter((option) => option.category === 'field')
}

export function resolveDefaultDataOptionValue(
  currentOptions: readonly DataPropertyOption[],
  currentDefaultValue: unknown,
): unknown {
  const defaultOptions = createDefaultDataOptions(currentOptions)
  return defaultOptions.some((option) => option.value === currentDefaultValue)
    ? currentDefaultValue
    : defaultOptions[0]?.value
}

export function createSystemDataOptions(catalogOptions: readonly DataTypePropertyOption[]): DataPropertyOption[] {
  return catalogOptions
    .filter((option) => option.category === 'field' && option.systemDefault === 1)
    .map(cloneOption)
}

export function createAddableDataOptions(
  catalogOptions: readonly DataTypePropertyOption[],
  currentOptions: readonly Record<string, any>[],
): DataPropertyOption[] {
  const existingValues = new Set(currentOptions.map((option) => String(option.value)))
  const existingSymbols = new Set(currentOptions.map((option) => option.metricSymbol).filter(Boolean))
  return createActiveFieldDataOptions(catalogOptions)
    .filter((option) => (
      !existingValues.has(String(option.value))
      && !existingSymbols.has(option.metricSymbol)
    ))
}

export function createEditDataOptions(
  storedOptions: readonly Record<string, any>[] | undefined,
  catalogOptions: readonly DataTypePropertyOption[],
): DataPropertyOption[] {
  const activeOptions = createActiveFieldDataOptions(catalogOptions)
  const byValue = new Map(activeOptions.map((option) => [option.value, option]))
  const byMetricSymbol = new Map(activeOptions.map((option) => [option.metricSymbol, option]))

  return (storedOptions || []).map((storedOption) => {
    const systemOption = byValue.get(storedOption.value) || byMetricSymbol.get(storedOption.metricSymbol)
    return cloneOption(systemOption ? { ...storedOption, ...systemOption } : storedOption) as DataPropertyOption
  })
}

export function resolveDataOptionSettingsLabel(
  option: Partial<DataPropertyOption> | null | undefined,
  locale: SupportedLocale,
): string {
  if (!option) return ''
  const localizedLabel = locale === 'zh' || locale === 'zh-tw'
    ? option.settingsLabel?.zhs
    : option.settingsLabel?.eng
  return localizedLabel || option.name || option.label || option.metricSymbol || ''
}

export function restoreSystemDataOptions(
  catalogOptions: readonly DataTypePropertyOption[],
  currentDefaultValue: unknown,
): { options: DataPropertyOption[]; defaultValue: unknown } {
  const options = createSystemDataOptions(catalogOptions)
  const defaultValue = options.some((option) => option.value === currentDefaultValue)
    ? currentDefaultValue
    : options[0]?.value
  return { options, defaultValue }
}
