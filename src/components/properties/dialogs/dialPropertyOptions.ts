import type { DataTypePropertyOption } from '@/stores/dataCatalogStore'
import type { DialProgressMode } from '@/types/settings'

export type DialPropertyOption = DataTypePropertyOption & Record<string, any>

const cloneOption = <T extends object>(option: T): T => JSON.parse(JSON.stringify(option)) as T

export function resolveDialOptionSymbols(
  metricSymbols: readonly string[] | undefined,
  storedOptions: readonly Record<string, any>[] | undefined,
): string[] {
  const source = Array.isArray(metricSymbols)
    ? metricSymbols
    : (storedOptions || []).map((option) => String(option.metricSymbol || ''))
  return [...new Set(source.map(String).filter(Boolean))]
}

export function resolveDialOptionsBySymbols(
  catalogOptions: readonly DialPropertyOption[],
  storedOptions: readonly Record<string, any>[] | undefined,
  metricSymbols: readonly string[],
  mode: DialProgressMode,
): DialPropertyOption[] {
  const canonicalBySymbol = new Map(catalogOptions.map((option) => [option.metricSymbol, option]))
  const storedBySymbol = new Map((storedOptions || []).map((option) => [String(option.metricSymbol || ''), option]))
  const result: DialPropertyOption[] = []
  const seen = new Set<string>()
  for (const symbol of metricSymbols) {
    if (!symbol || seen.has(symbol)) continue
    seen.add(symbol)
    const canonical = canonicalBySymbol.get(symbol)
    const stored = storedBySymbol.get(symbol)
    const merged = canonical ? { ...(stored || {}), ...canonical } : stored
    if (!merged || merged.dialMode !== mode || merged.isActive === 0) continue
    result.push(cloneOption(merged as DialPropertyOption))
  }
  return result
}

export function createDefaultDialOptions(
  catalogOptions: readonly DialPropertyOption[],
  mode: DialProgressMode,
): DialPropertyOption[] {
  const active = catalogOptions
    .filter((option) => option.isActive === 1 && option.dialMode === mode)
    .map(cloneOption)
  const systemDefaults = active.filter((option) => option.systemDefault === 1)
  return systemDefaults.length > 0 ? systemDefaults : active
}

export function createAddableDialOptions(
  catalogOptions: readonly DialPropertyOption[],
  currentOptions: readonly DialPropertyOption[],
  mode: DialProgressMode,
): DialPropertyOption[] {
  const currentSymbols = new Set(currentOptions.map((option) => option.metricSymbol))
  return catalogOptions
    .filter((option) => option.isActive === 1 && option.dialMode === mode)
    .map(cloneOption)
    .filter((option) => !currentSymbols.has(option.metricSymbol))
}
