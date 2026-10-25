export const normalizePositiveAppId = (value: string): number | undefined => {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) return undefined

  const appId = Number(normalized)
  return Number.isSafeInteger(appId) && appId > 0 ? appId : undefined
}

export const versionOperators = [
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'eq', label: '=' },
  { value: 'gte', label: '≥' },
  { value: 'gt', label: '>' },
] as const
export type VersionOperator = typeof versionOperators[number]['value']
export const isPackagedVersion = (value: string): boolean => /^\d{1,9}\.\d{1,9}\.\d{1,9}$/.test(value.trim())
