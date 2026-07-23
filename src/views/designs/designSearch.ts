export const normalizePositiveAppId = (value: string): number | undefined => {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) return undefined

  const appId = Number(normalized)
  return Number.isSafeInteger(appId) && appId > 0 ? appId : undefined
}
